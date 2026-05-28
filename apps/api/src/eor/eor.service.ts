import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployersService } from '../employers/employers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEorContractDto, UpdateEorContractDto } from './dto/eor.dto';

@Injectable()
export class EorService {
  private readonly logger = new Logger(EorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly employersService: EmployersService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateEorContractDto) {
    const m = await this.employersService.getEmployerForUser(userId);
    await this.employersService.assertOwnerOrAdmin(userId, m.employerId);

    // Default management fee: 8% of monthly salary, min ₦50,000
    const managementFee = dto.managementFee ?? Math.max(dto.monthlySalary * 0.08, 50_000);

    return this.prisma.eorContract.create({
      data: {
        employerId: m.employerId,
        candidateUserId: dto.candidateUserId,
        jobTitle: dto.jobTitle,
        monthlySalary: dto.monthlySalary,
        currency: dto.currency ?? 'NGN',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        probationMonths: dto.probationMonths ?? 3,
        managementFee,
        status: 'PENDING',
      },
    });
  }

  async listForEmployer(userId: string) {
    const m = await this.employersService.getEmployerForUser(userId);
    return this.prisma.eorContract.findMany({
      where: { employerId: m.employerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async byId(userId: string, contractId: string) {
    const contract = await this.prisma.eorContract.findUnique({
      where: { id: contractId },
      include: { payslips: { orderBy: { createdAt: 'desc' }, take: 12 } },
    });
    if (!contract) throw new NotFoundException();

    if (contract.candidateUserId !== userId) {
      await this.employersService.assertMember(userId, contract.employerId);
    }
    return contract;
  }

  async update(userId: string, contractId: string, dto: UpdateEorContractDto) {
    const contract = await this.prisma.eorContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, contract.employerId);

    return this.prisma.eorContract.update({
      where: { id: contractId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status as any,
      },
    });
  }

  async activate(userId: string, contractId: string) {
    const contract = await this.prisma.eorContract.findUnique({
      where: { id: contractId },
      include: { employer: true },
    });
    if (!contract) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, contract.employerId);

    const activated = await this.prisma.eorContract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE', signedAt: new Date() },
    });

    // Email the employee
    const employee = await this.prisma.user.findUnique({
      where: { id: contract.candidateUserId },
      select: { email: true, firstName: true },
    });
    if (employee) {
      const fmt = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: contract.currency,
        maximumFractionDigits: 0,
      });
      this.notifications
        .sendEmail({
          to: employee.email,
          subject: `Welcome to ${contract.employer.name}`,
          template: 'eor-contract-activated',
          data: {
            firstName: employee.firstName,
            employerName: contract.employer.name,
            jobTitle: contract.jobTitle,
            startDate: contract.startDate.toISOString().slice(0, 10),
            salary: fmt.format(Number(contract.monthlySalary)),
          },
        })
        .catch((err) => this.logger.warn(`EOR activation email failed: ${err.message}`));
    }

    return activated;
  }

  async terminate(userId: string, contractId: string) {
    const contract = await this.prisma.eorContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, contract.employerId);

    return this.prisma.eorContract.update({
      where: { id: contractId },
      data: { status: 'TERMINATED', endDate: new Date() },
    });
  }

  async myContracts(userId: string) {
    return this.prisma.eorContract.findMany({
      where: { candidateUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
