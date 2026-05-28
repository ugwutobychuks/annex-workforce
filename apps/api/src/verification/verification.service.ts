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
}
