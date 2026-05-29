import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InitiateVerificationDto } from './dto/verification.dto';

/**
 * Verification Service
 *
 * Wraps third-party identity & credential providers (Smile Identity,
 * Youverify) behind a single interface. In production, the actual
 * provider calls happen inside async jobs; this service handles the
 * record-keeping + result interpretation.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async initiate(userId: string, dto: InitiateVerificationDto) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException('Candidate profile not found');

    const record = await this.prisma.verificationRecord.create({
      data: {
        candidateId: candidate.id,
        type: dto.type,
        provider: dto.provider ?? this.defaultProvider(dto.type),
        status: 'PENDING',
        result: dto.metadata ?? {},
      },
    });

    // Fire & forget — in production, push to a BullMQ queue
    this.runVerification(record.id).catch((e) =>
      this.logger.error(`Verification failed: ${(e as Error).message}`),
    );

    return record;
  }

  async listForCandidate(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) return [];
    return this.prisma.verificationRecord.findMany({
      where: { candidateId: candidate.id },
      orderBy: { initiatedAt: 'desc' },
    });
  }

  async adminList(filters: { status?: string; page: number; limit: number }) {
    const where: any = filters.status ? { status: filters.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.verificationRecord.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { initiatedAt: 'desc' },
        include: {
          candidate: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      }),
      this.prisma.verificationRecord.count({ where }),
    ]);
    return { items, total, page: filters.page, limit: filters.limit };
  }

  async manualApprove(verificationId: string, approverId: string) {
    const record = await this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: {
        status: 'VERIFIED',
        completedAt: new Date(),
        result: { approvedBy: approverId, manual: true },
      },
      include: { candidate: true },
    });
    await this.bumpVerificationLevel(record.candidateId);
    return record;
  }

  async manualReject(verificationId: string, approverId: string, reason: string) {
    return this.prisma.verificationRecord.update({
      where: { id: verificationId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        result: { rejectedBy: approverId, reason },
      },
    });
  }

  // ─── Internal: provider integration stubs ────────────────────

  private async runVerification(recordId: string) {
    const record = await this.prisma.verificationRecord.findUnique({ where: { id: recordId } });
    if (!record) return;

    let success = false;
    let providerResult: Record<string, unknown> = {};

    try {
      // In production: call Smile Identity / Youverify here.
      // For MVP we simulate a successful identity verification.
      if (record.provider === 'smile_identity') {
        providerResult = await this.callSmileIdentity(record);
        success = true;
      } else if (record.provider === 'youverify') {
        providerResult = await this.callYouverify(record);
        success = true;
      } else {
        // Manual-only — leave as PENDING for an admin to handle
        return;
      }
    } catch (e) {
      providerResult = { error: (e as Error).message };
    }

    await this.prisma.verificationRecord.update({
      where: { id: recordId },
      data: {
        status: success ? 'VERIFIED' : 'FAILED',
        completedAt: new Date(),
        result: providerResult as any,
      },
    });

    if (success) await this.bumpVerificationLevel(record.candidateId);
  }

  private async callSmileIdentity(record: { type: string }): Promise<Record<string, unknown>> {
    const apiKey = this.config.get<string>('SMILE_IDENTITY_API_KEY');
    if (!apiKey) {
      this.logger.warn('SMILE_IDENTITY_API_KEY missing — returning stub success');
      return { simulated: true, type: record.type };
    }
    // TODO: integrate Smile Identity SDK.
    // https://docs.smileidentity.com/products/biometric-kyc
    return { simulated: true };
  }

  private async callYouverify(record: { type: string }): Promise<Record<string, unknown>> {
    const apiKey = this.config.get<string>('YOUVERIFY_API_KEY');
    if (!apiKey) {
      this.logger.warn('YOUVERIFY_API_KEY missing — returning stub success');
      return { simulated: true, type: record.type };
    }
    // TODO: call https://api.youverify.co/v2/api/...
    return { simulated: true };
  }

  private async bumpVerificationLevel(candidateId: string) {
    const records = await this.prisma.verificationRecord.findMany({
      where: { candidateId, status: 'VERIFIED' },
    });
    const types = new Set(records.map((r: { type: string }) => r.type));

    let level: 'EMAIL_VERIFIED' | 'IDENTITY_VERIFIED' | 'CREDENTIALS_VERIFIED' | 'FULLY_VERIFIED' =
      'EMAIL_VERIFIED';
    if (types.has('IDENTITY')) level = 'IDENTITY_VERIFIED';
    if (types.has('IDENTITY') && types.has('EDUCATION')) level = 'CREDENTIALS_VERIFIED';
    if (types.has('IDENTITY') && types.has('EDUCATION') && types.has('EMPLOYMENT')) {
      level = 'FULLY_VERIFIED';
    }

    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { verificationLevel: level as any },
    });
  }

  private defaultProvider(type: string): string {
    if (type === 'IDENTITY') return 'smile_identity';
    if (type === 'EMPLOYMENT' || type === 'BACKGROUND') return 'youverify';
    return 'manual';
  }
}
