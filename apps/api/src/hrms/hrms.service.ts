import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployersService } from '../employers/employers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeaveDto, DecideLeaveDto } from './dto/hrms.dto';

const DEFAULT_ENTITLEMENTS: Record<string, number> = {
  ANNUAL: 24,
  SICK: 12,
  MATERNITY: 84,
  PATERNITY: 14,
  COMPASSIONATE: 5,
  STUDY: 10,
  UNPAID: 0,
};

@Injectable()
export class HrmsService {
  private readonly logger = new Logger(HrmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly employersService: EmployersService,
    private readonly notifications: NotificationsService,
  ) {}

  async requestLeave(userId: string, dto: CreateLeaveDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('endDate must be after startDate');

    // Find user's active EOR contract → resolves their employer
    const contract = await this.prisma.eorContract.findFirst({
      where: { candidateUserId: userId, status: 'ACTIVE' },
    });
    if (!contract) {
      throw new BadRequestException('You must be on an active contract to request leave');
    }

    const days = this.workingDays(start, end);

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: userId,
        employerId: contract.employerId,
        type: dto.type as any,
        startDate: start,
        endDate: end,
        daysRequested: days,
        reason: dto.reason,
        status: 'PENDING',
      },
    });
  }

  async myLeave(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pendingForEmployer(userId: string) {
    const m = await this.employersService.getEmployerForUser(userId);
    return this.prisma.leaveRequest.findMany({
      where: { employerId: m.employerId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async allLeaveForEmployer(userId: string) {
    const m = await this.employersService.getEmployerForUser(userId);
    return this.prisma.leaveRequest.findMany({
      where: { employerId: m.employerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(userId: string, leaveId: string, dto: DecideLeaveDto) {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, leave.employerId);

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Leave already decided');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: dto.decision as any,
        approverId: userId,
        approverNote: dto.note,
        decidedAt: new Date(),
      },
    });

    if (dto.decision === 'APPROVED') {
      await this.adjustBalance(leave.employeeId, leave.employerId, leave.type, leave.daysRequested);
    }

    // Notify the employee of the decision (fire-and-forget)
    const employee = await this.prisma.user.findUnique({
      where: { id: leave.employeeId },
      select: { email: true, firstName: true },
    });
    if (employee) {
      this.notifications
        .sendEmail({
          to: employee.email,
          subject: `Leave request ${dto.decision === 'APPROVED' ? 'approved' : 'declined'}`,
          template: 'leave-decision',
          data: {
            firstName: employee.firstName,
            decision: dto.decision,
            type: leave.type,
            startDate: leave.startDate.toISOString().slice(0, 10),
            endDate: leave.endDate.toISOString().slice(0, 10),
            days: leave.daysRequested,
            note: dto.note,
          },
        })
        .catch((err) => this.logger.warn(`Leave decision email failed: ${err.message}`));
    }

    return updated;
  }

  async cancelLeave(userId: string, leaveId: string) {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) throw new NotFoundException();
    if (leave.employeeId !== userId) throw new ForbiddenException();
    if (leave.status === 'CANCELLED') return leave;

    if (leave.status === 'APPROVED') {
      // Refund the days
      await this.adjustBalance(leave.employeeId, leave.employerId, leave.type, -leave.daysRequested);
    }

    return this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status: 'CANCELLED' },
    });
  }

  async myBalances(userId: string) {
    const year = new Date().getFullYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId: userId, year },
    });

    // Synthesize defaults for any missing leave types
    const types = Object.keys(DEFAULT_ENTITLEMENTS);
    return types.map((type) => {
      const existing = balances.find((b) => b.type === type);
      return {
        type,
        year,
        entitled: existing?.entitled ?? DEFAULT_ENTITLEMENTS[type],
        used: existing?.used ?? 0,
        carriedOver: existing?.carriedOver ?? 0,
        remaining: (existing?.entitled ?? DEFAULT_ENTITLEMENTS[type]) - (existing?.used ?? 0),
      };
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private async adjustBalance(
    employeeId: string,
    employerId: string,
    type: string,
    daysToAdd: number,
  ) {
    const year = new Date().getFullYear();
    await this.prisma.leaveBalance.upsert({
      where: { employeeId_type_year: { employeeId, type: type as any, year } },
      create: {
        employeeId,
        employerId,
        type: type as any,
        year,
        entitled: DEFAULT_ENTITLEMENTS[type] ?? 0,
        used: Math.max(0, daysToAdd),
      },
      update: { used: { increment: daysToAdd } },
    });
  }

  /** Count Mon–Fri days inclusive between two dates */
  private workingDays(start: Date, end: Date): number {
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = cursor.getUTCDay();
      if (day !== 0 && day !== 6) count++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
  }
}
