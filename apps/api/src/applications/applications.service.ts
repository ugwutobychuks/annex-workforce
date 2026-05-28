import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmployersService } from '../employers/employers.service';
import { ApplyDto, UpdateApplicationStatusDto } from './dto/application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly employersService: EmployersService,
  ) {}

  async apply(userId: string, dto: ApplyDto) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!candidate) throw new BadRequestException('Complete your candidate profile first');

    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
      include: { employer: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'PUBLISHED') {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
    });
    if (existing) throw new ConflictException('You have already applied to this job');

    const application = await this.prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        coverLetter: dto.coverLetter,
        resumeUrl: dto.resumeUrl ?? candidate.resumeUrl,
        status: 'APPLIED',
      },
      include: { job: { include: { employer: true } }, candidate: true },
    });

    // Notify candidate
    this.notifications
      .sendEmail({
        to: candidate.user.email,
        subject: `Application received — ${job.title}`,
        template: 'application-received',
        data: {
          firstName: candidate.user.firstName,
          jobTitle: job.title,
          companyName: job.employer.name,
        },
      })
      .catch(() => {});

    // Notify the employer's owners/admins (fire-and-forget)
    this.notifyEmployerOfApplication(job.employerId, application.id, job, candidate).catch(() => {});

    return application;
  }

  private async notifyEmployerOfApplication(
    employerId: string,
    applicationId: string,
    job: { id: string; title: string },
    candidate: { user: { firstName: string; lastName: string }; headline: string | null; location: string | null },
  ) {
    const recipients = await this.prisma.employerMembership.findMany({
      where: { employerId, role: { in: ['OWNER', 'ADMIN'] } },
      include: { user: { select: { email: true } } },
    });

    for (const m of recipients) {
      this.notifications
        .sendEmail({
          to: m.user.email,
          subject: `New applicant — ${job.title}`,
          template: 'application-received-employer',
          data: {
            jobId: job.id,
            jobTitle: job.title,
            candidateName: `${candidate.user.firstName} ${candidate.user.lastName}`,
            candidateHeadline: candidate.headline,
            candidateLocation: candidate.location,
          },
        })
        .catch(() => {});
    }
  }

  async myApplications(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) return [];
    return this.prisma.application.findMany({
      where: { candidateId: candidate.id },
      include: {
        job: {
          include: { employer: { select: { name: true, logoUrl: true } } },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async withdrawApplication(userId: string, applicationId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new ForbiddenException();

    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app || app.candidateId !== candidate.id) throw new NotFoundException();

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async listForJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    await this.employersService.assertMember(userId, job.employerId);

    return this.prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, avatarUrl: true },
            },
            skills: { include: { skill: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateStatus(userId: string, applicationId: string, dto: UpdateApplicationStatusDto) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        candidate: { include: { user: true } },
      },
    });
    if (!app) throw new NotFoundException();
    await this.employersService.assertMember(userId, app.job.employerId);

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status as any,
        notes: dto.note
          ? { push: { at: new Date(), by: userId, note: dto.note, status: dto.status } } as any
          : undefined,
      },
    });

    // Notify candidate of status change for major transitions
    if (['SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].includes(dto.status)) {
      this.notifications
        .sendEmail({
          to: app.candidate.user.email,
          subject: `Update on your application: ${app.job.title}`,
          template: 'application-status-changed',
          data: {
            firstName: app.candidate.user.firstName,
            jobTitle: app.job.title,
            companyName: app.job.employer.name,
            status: dto.status,
            note: dto.note,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  async byId(userId: string, applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        candidate: { include: { user: true, skills: { include: { skill: true } }, experiences: true } },
      },
    });
    if (!app) throw new NotFoundException();

    // Either the candidate themselves OR a member of the employer can view
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    const isOwner = candidate?.id === app.candidateId;
    if (!isOwner) {
      await this.employersService.assertMember(userId, app.job.employerId);
    }

    return app;
  }
}
