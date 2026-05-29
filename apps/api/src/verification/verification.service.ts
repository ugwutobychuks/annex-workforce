import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async initiate(candidateId: string, dto: InitiateVerificationDto) {
    return this.prisma.verificationRecord.create({
      data: {
        candidateId,
        type: dto.type,
        provider: dto.provider || 'manual',
        status: 'PENDING',
        result: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async listForCandidate(candidateId: string) {
    return this.prisma.verificationRecord.findMany({
      where: { candidateId },
      orderBy: { initiatedAt: 'desc' },
    });
  }

  async adminList(filters?: any) {
    return this.prisma.verificationRecord.findMany({
      include: { candidate: true },
      orderBy: { initiatedAt: 'desc' },
    });
  }

  async manualApprove(id: string, adminId: string) {
    const record = await this.prisma.verificationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Verification record not found');
    return this.prisma.verificationRecord.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        completedAt: new Date(),
        result: { ...(record.result as object), manuallyApproved: true, approvedBy: adminId },
      },
    });
  }

  async manualReject(id: string, adminId: string, reason?: string) {
    const record = await this.prisma.verificationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Verification record not found');
    return this.prisma.verificationRecord.update({
      where: { id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        result: { ...(record.result as object), rejectionReason: reason || 'Manual rejection', rejectedBy: adminId },
      },
    });
  }
<<<<<<< HEAD

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
=======
>>>>>>> db82deb7d6fc8de126410ed794a570ddf4b7196c
}
