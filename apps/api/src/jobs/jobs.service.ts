import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService, INDEX_JOBS } from '../search/search.service';
import { EmployersService } from '../employers/employers.service';
import { CreateJobDto, UpdateJobDto, SearchJobsDto } from './dto/job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly employersService: EmployersService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    const m = await this.employersService.getEmployerForUser(userId);
    await this.employersService.assertOwnerOrAdmin(userId, m.employerId);

    const job = await this.prisma.job.create({
      data: {
        employerId: m.employerId,
        title: dto.title,
        description: dto.description,
        responsibilities: dto.responsibilities,
        requirements: dto.requirements,
        benefits: dto.benefits,
        location: dto.location,
        country: dto.country ?? 'NG',
        workArrangement: (dto.workArrangement ?? 'ONSITE') as any,
        employmentType: (dto.employmentType ?? 'FULL_TIME') as any,
        seniority: (dto.seniority ?? 'MID') as any,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency ?? 'NGN',
        isEor: dto.isEor ?? false,
        status: 'DRAFT',
      },
      include: { employer: true, skills: { include: { skill: true } } },
    });

    if (dto.skillNames?.length) {
      await this.attachSkills(job.id, dto.skillNames);
    }

    return this.byId(job.id);
  }

  async update(userId: string, jobId: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, job.employerId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...dto,
        workArrangement: dto.workArrangement as any,
        employmentType: dto.employmentType as any,
        seniority: dto.seniority as any,
      },
    });

    if (dto.skillNames) {
      await this.prisma.jobSkill.deleteMany({ where: { jobId } });
      await this.attachSkills(jobId, dto.skillNames);
    }

    if (updated.status === 'PUBLISHED') {
      await this.indexJob(jobId);
    } else {
      await this.search.deleteDoc(INDEX_JOBS, jobId);
    }

    return this.byId(jobId);
  }

  async publish(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, job.employerId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.indexJob(jobId);
    return updated;
  }

  async close(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    await this.employersService.assertOwnerOrAdmin(userId, job.employerId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'CLOSED' },
    });
    await this.search.deleteDoc(INDEX_JOBS, jobId);
    return updated;
  }

  async byId(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        employer: { select: { id: true, name: true, logoUrl: true, industry: true, hqCity: true } },
        skills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    // Increment view counter (fire & forget)
    this.prisma.job.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {});
    return job;
  }

  async listEmployerJobs(userId: string) {
    const m = await this.employersService.getEmployerForUser(userId);
    return this.prisma.job.findMany({
      where: { employerId: m.employerId },
      include: {
        skills: { include: { skill: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async publicSearch(filters: SearchJobsDto) {
    // If ES is up, prefer ES. Otherwise fallback to Postgres.
    try {
      const must: any[] = [];
      if (filters.q) {
        must.push({
          multi_match: {
            query: filters.q,
            fields: ['title^3', 'description', 'employerName^2', 'skills'],
          },
        });
      }
      if (filters.location) must.push({ term: { location: filters.location } });
      if (filters.country) must.push({ term: { country: filters.country } });
      if (filters.workArrangement) must.push({ term: { workArrangement: filters.workArrangement } });
      if (filters.employmentType) must.push({ term: { employmentType: filters.employmentType } });
      if (filters.seniority) must.push({ term: { seniority: filters.seniority } });
      if (filters.skills?.length) must.push({ terms: { skills: filters.skills } });
      if (filters.minSalary !== undefined) {
        must.push({ range: { salaryMin: { gte: filters.minSalary } } });
      }

      const result = await this.search.search(
        INDEX_JOBS,
        must.length ? { bool: { must } } : { match_all: {} },
        {
          from: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
          size: filters.limit ?? 20,
          sort: [{ publishedAt: { order: 'desc' } }],
        },
      );

      if (result.total > 0) {
        return { ...result, page: filters.page ?? 1, limit: filters.limit ?? 20 };
      }
    } catch {
      /* fallthrough to postgres */
    }

    // Postgres fallback
    const where: any = { status: 'PUBLISHED' };
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters.country) where.country = filters.country;
    if (filters.workArrangement) where.workArrangement = filters.workArrangement;
    if (filters.employmentType) where.employmentType = filters.employmentType;
    if (filters.seniority) where.seniority = filters.seniority;

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
        take: filters.limit ?? 20,
        orderBy: { publishedAt: 'desc' },
        include: {
          employer: { select: { name: true, logoUrl: true } },
          skills: { include: { skill: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      hits: items,
      total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private async attachSkills(jobId: string, names: string[]) {
    for (const name of names) {
      const skill = await this.prisma.skill.upsert({
        where: { name },
        create: { name, category: 'Other' },
        update: {},
      });
      await this.prisma.jobSkill
        .create({ data: { jobId, skillId: skill.id } })
        .catch(() => {});
    }
  }

  private async indexJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true, skills: { include: { skill: true } } },
    });
    if (!job || job.status !== 'PUBLISHED') return;

    try {
      await this.search.indexDoc(INDEX_JOBS, job.id, {
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        country: job.country,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        seniority: job.seniority,
        salaryMin: Number(job.salaryMin ?? 0),
        salaryMax: Number(job.salaryMax ?? 0),
        skills: job.skills.map((s: any) => s.skill.name),
        employerName: job.employer.name,
        publishedAt: job.publishedAt,
      });
    } catch {
      /* swallow */
    }
  }
}
