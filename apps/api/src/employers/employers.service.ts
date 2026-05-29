import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployerDto, UpdateEmployerDto } from './dto/employer.dto';

@Injectable()
export class EmployersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEmployerDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const employer = await tx.employer.create({
        data: {
          name: dto.name,
          legalName: dto.legalName,
          industry: dto.industry,
          size: dto.size,
          website: dto.website,
          description: dto.description,
          hqCountry: dto.hqCountry ?? 'NG',
          hqCity: dto.hqCity,
          rcNumber: dto.rcNumber,
          taxId: dto.taxId,
        },
      });
      await tx.employerMembership.create({
        data: { userId, employerId: employer.id, role: 'OWNER' },
      });
      // Promote user role to EMPLOYER
      await tx.user.update({ where: { id: userId }, data: { role: 'EMPLOYER' } });
      return employer;
    });
  }

  async myEmployer(userId: string) {
    const membership = await this.prisma.employerMembership.findFirst({
      where: { userId },
      include: {
        employer: {
          include: {
            jobs: { take: 5, orderBy: { createdAt: 'desc' } },
            members: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          },
        },
      },
    });
    if (!membership) throw new NotFoundException('No employer associated with this account');
    return { ...membership.employer, myRole: membership.role };
  }

  async update(userId: string, employerId: string, dto: UpdateEmployerDto) {
    await this.assertOwnerOrAdmin(userId, employerId);
    return this.prisma.employer.update({ where: { id: employerId }, data: dto });
  }

  async byId(id: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { id },
      include: { jobs: { where: { status: 'PUBLISHED' } } },
    });
    if (!employer) throw new NotFoundException();
    return employer;
  }

  async assertOwnerOrAdmin(userId: string, employerId: string) {
    const m = await this.prisma.employerMembership.findUnique({
      where: { userId_employerId: { userId, employerId } },
    });
    if (!m || (m.role !== 'OWNER' && m.role !== 'ADMIN')) {
      throw new ForbiddenException('You are not an admin of this employer');
    }
    return m;
  }

  async assertMember(userId: string, employerId: string) {
    const m = await this.prisma.employerMembership.findUnique({
      where: { userId_employerId: { userId, employerId } },
    });
    if (!m) throw new ForbiddenException('You are not a member of this employer');
    return m;
  }

  async getEmployerForUser(userId: string) {
    const m = await this.prisma.employerMembership.findFirst({ where: { userId } });
    if (!m) throw new ForbiddenException('No employer associated with this user');
    return m;
  }
}
