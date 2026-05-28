import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto, meta?: { ip?: string; userAgent?: string }): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: (dto.role ?? 'CANDIDATE') as any,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Auto-create candidate profile if role = CANDIDATE
    if (user.role === 'CANDIDATE') {
      await this.prisma.candidate.create({ data: { userId: user.id } });
    }

    // Create email verification token + send mail
    const verifyToken = uuidv4();
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 86_400_000), // 24h
      },
    });

    await this.notifications
      .sendEmail({
        to: user.email,
        subject: 'Verify your Annex Workforce account',
        template: 'email-verify',
        data: { firstName: user.firstName, token: verifyToken },
      })
      .catch((err) => this.logger.warn(`Failed to send verify email: ${err.message}`));

    await this.audit(user.id, 'REGISTER', 'auth', meta);

    return this.issueTokens(user, meta);
  }

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }): Promise<AuthResult> {
    // Rate limit by email + IP combo
    const rateKey = `login:${dto.email.toLowerCase()}:${meta?.ip ?? 'unknown'}`;
    const attempts = await this.redis.incr(rateKey, 900);
    if (attempts > 10) {
      throw new UnauthorizedException('Too many login attempts. Try again in 15 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account suspended. Please contact support.');
    }
    if (user.status === 'DEACTIVATED') {
      throw new UnauthorizedException('Account deactivated.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    await this.redis.del(rateKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit(user.id, 'LOGIN', 'auth', meta);

    return this.issueTokens(user, meta);
  }

  async refresh(refreshToken: string, meta?: { ip?: string; userAgent?: string }): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    // Token rotation
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    return this.issueTokens(stored.user, meta);
  }

  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    // Blacklist for remaining access-token TTL
    await this.redis.set(`bl:user:${userId}`, '1', 900);
    return { success: true };
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const record = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Verification link is invalid or expired');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, status: 'ACTIVE' },
      }),
      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Send welcome email (fire-and-forget)
    this.notifications
      .sendEmail({
        to: record.user.email,
        subject: `Welcome to Annex Workforce, ${record.user.firstName}`,
        template: 'welcome',
        data: { firstName: record.user.firstName },
      })
      .catch((err) => this.logger.warn(`Failed to send welcome email: ${err.message}`));

    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Don't leak existence — always return success
    if (!user) return { success: true };

    const token = uuidv4();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 3_600_000), // 1h
      },
    });

    await this.notifications
      .sendEmail({
        to: user.email,
        subject: 'Reset your Annex Workforce password',
        template: 'password-reset',
        data: { firstName: user.firstName, token },
      })
      .catch((err) => this.logger.warn(`Failed to send reset email: ${err.message}`));

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const record = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or expired');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    return { success: true };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private async issueTokens(
    user: { id: string; email: string; role: string; firstName: string; lastName: string; status: string; emailVerified: boolean },
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = uuidv4();
    const ttl = this.parseDuration(this.config.get('JWT_REFRESH_TTL', '7d'));
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + ttl),
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  private parseDuration(d: string): number {
    const m = d.match(/^(\d+)([smhd])$/);
    if (!m) return 604_800_000;
    const [, n, u] = m;
    return parseInt(n, 10) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[u as 'd']!;
  }

  private async audit(userId: string | null, action: string, resource: string, meta?: { ip?: string; userAgent?: string }) {
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action,
          resource,
          ipAddress: meta?.ip,
          userAgent: meta?.userAgent,
        },
      })
      .catch(() => {});
  }
}
