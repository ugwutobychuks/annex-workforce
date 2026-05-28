import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployersService } from '../employers/employers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaxEngineService } from './tax-engine.service';
import { CreatePayrollRunDto } from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly employersService: EmployersService,
    private readonly taxEngine: TaxEngineService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Create a draft payroll run for a given period (YYYY-MM). */
  async createRun(userId: string, dto: CreatePayrollRunDto) {
    const m = await this.employersService.getEmployerForUser(userId);
    await this.employersService.assertOwnerOrAdmin(userId, m.employerId);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dto.period)) {
      throw new BadRequestException('period must be YYYY-MM');
    }

    const existing = await this.prisma.payrollRun.findUnique({
      where: { employerId_period: { employerId: m.employerId, period: dto.period } },
    });
    if (existing) throw new BadRequestException(`Payroll for ${dto.period} already exists`);

    // Pull all active EOR contracts for this employer
    const contracts = await this.prisma.eorContract.findMany({
      where: { employerId: m.employerId, status: 'ACTIVE' },
    });

    if (contracts.length === 0) {
      throw new BadRequestException('No active contracts to run payroll for');
    }

    // Compute payslips
    const payslipData = contracts.map((c: any) => {
      const calc = this.taxEngine.compute({ grossSalary: Number(c.monthlySalary) });
      return { contractId: c.id, calc };
    });

    const totals = payslipData.reduce(
      (acc: any, p: any) => {
        acc.gross += p.calc.grossSalary;
        acc.net += p.calc.netSalary;
        acc.tax += p.calc.payeTax;
        acc.pension += p.calc.pensionEmployee;
        return acc;
      },
      { gross: 0, net: 0, tax: 0, pension: 0 },
    );

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const run = await tx.payrollRun.create({
        data: {
          employerId: m.employerId,
          period: dto.period,
          status: 'DRAFT',
          totalGross: totals.gross,
          totalNet: totals.net,
          totalTax: totals.tax,
          totalPension: totals.pension,
        },
      });

      for (const p of payslipData) {
        await tx.payslip.create({
          data: {
            payrollRunId: run.id,
            contractId: p.contractId,
            grossSalary: p.calc.grossSalary,
            payeTax: p.calc.payeTax,
            pension: p.calc.pensionEmployee,
            nhf: p.calc.nhf,
            otherDeductions: p.calc.otherDeductions,
            netSalary: p.calc.netSalary,
          },
        });
      }

      return tx.payrollRun.findUnique({
        where: { id: run.id },
        include: { payslips: { include: { contract: true } } },
      });
    });
  }

  async listRuns(userId: string) {
    const m = await this.employersService.getEmployerForUser(userId);
    return this.prisma.payrollRun.findMany({
      where: { employerId: m.employerId },
      orderBy: { period: 'desc' },
      include: { _count: { select: { payslips: true } } },
    });
  }

  async getRun(userId: string, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: {
            contract: true,
          },
        },
      },
    });
    if (!run) throw new NotFoundException();
    await this.employersService.assertMember(userId, run.employerId);
    return run;
  }

  async approve(userId: string, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, run.employerId);

    if (run.status !== 'DRAFT') {
      throw new BadRequestException('Only draft runs can be approved');
    }

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }

  async process(userId: string, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, run.employerId);

    if (run.status !== 'APPROVED') {
      throw new BadRequestException('Run must be approved first');
    }

    // In production: trigger Paystack/Flutterwave bulk-disbursement here
    // and fire off PAYE/Pension/NHF remittance jobs.
    const processed = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });

    // Notify each employee that their payslip is ready
    this.notifyEmployeesOfPayroll(runId).catch((err) =>
      this.logger.warn(`Payroll notifications failed: ${err.message}`),
    );

    return processed;
  }

  private async notifyEmployeesOfPayroll(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payslips: {
          include: {
            contract: {
              select: { candidateUserId: true, currency: true },
            },
          },
        },
      },
    });
    if (!run) return;

    for (const slip of run.payslips) {
      const employee = await this.prisma.user.findUnique({
        where: { id: slip.contract.candidateUserId },
        select: { email: true, firstName: true },
      });
      if (!employee) continue;

      const fmt = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: slip.contract.currency,
        maximumFractionDigits: 0,
      });
      this.notifications
        .sendEmail({
          to: employee.email,
          subject: `Your ${run.period} payslip is ready`,
          template: 'payroll-processed',
          data: {
            firstName: employee.firstName,
            period: run.period,
            netSalary: fmt.format(Number(slip.netSalary)),
          },
        })
        .catch(() => {});
    }
  }

  /** What an employee sees in their HRMS portal */
  async myPayslips(userId: string) {
    const contracts = await this.prisma.eorContract.findMany({
      where: { candidateUserId: userId },
      select: { id: true },
    });
    if (contracts.length === 0) return [];
    return this.prisma.payslip.findMany({
      where: { contractId: { in: contracts.map((c: any) => c.id) } },
      include: { payrollRun: true, contract: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Quick "what would this salary cost me" calculator for employers */
  estimate(grossSalary: number) {
    return this.taxEngine.compute({ grossSalary });
  }
}
