import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService, INDEX_CANDIDATES } from '../search/search.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { SearchCandidatesDto } from './dto/search-candidates.dto';
import { AddSkillDto, AddExperienceDto, AddEducationDto } from './dto/profile-items.dto';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startYear: 'desc' } },
        certifications: true,
        documents: true,
      },
    });
    if (!candidate) throw new NotFoundException('Profile not found');
    return candidate;
  }

  async getById(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: 'desc' } },
        educations: true,
      },
    });
    if (!candidate) throw new NotFoundException();
    return candidate;
  }

  async updateProfile(userId: string, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.candidate.upsert({
      where: { userId },
      create: { userId, ...this.mapDto(dto) },
      update: this.mapDto(dto),
      include: { user: true, skills: { include: { skill: true } } },
    });

    await this.indexCandidate(candidate);
    return candidate;
  }

  async addSkill(userId: string, dto: AddSkillDto) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();

    const skill = await this.prisma.skill.upsert({
      where: { name: dto.name },
      create: { name: dto.name, category: dto.category ?? 'Other' },
      update: {},
    });

    await this.prisma.candidateSkill.upsert({
      where: { candidateId_skillId: { candidateId: candidate.id, skillId: skill.id } },
      create: {
        candidateId: candidate.id,
        skillId: skill.id,
        level: dto.level ?? 3,
        yearsExp: dto.yearsExp ?? 0,
      },
      update: { level: dto.level, yearsExp: dto.yearsExp },
    });

    return this.getProfile(userId);
  }

  async removeSkill(userId: string, skillId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();

    await this.prisma.candidateSkill.deleteMany({
      where: { candidateId: candidate.id, skillId },
    });
    return { success: true };
  }

  async addExperience(userId: string, dto: AddExperienceDto) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();
    return this.prisma.workExperience.create({
      data: {
        candidateId: candidate.id,
        company: dto.company,
        title: dto.title,
        location: dto.location,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  async addEducation(userId: string, dto: AddEducationDto) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();
    return this.prisma.education.create({
      data: {
        candidateId: candidate.id,
        institution: dto.institution,
        degree: dto.degree,
        fieldOfStudy: dto.fieldOfStudy,
        startYear: dto.startYear,
        endYear: dto.endYear,
        grade: dto.grade,
      },
    });
  }

  async uploadResume(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException();

    const { url, key } = await this.storage.upload({
      file: file.buffer,
      folder: `candidates/${candidate.id}/resume`,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: { resumeUrl: url },
    });

    await this.prisma.candidateDocument.create({
      data: {
        candidateId: candidate.id,
        type: 'RESUME',
        fileName: file.originalname,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    return { url, key };
  }

  async searchCandidates(filters: SearchCandidatesDto, requesterRole: string) {
    if (!['EMPLOYER', 'HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(requesterRole)) {
      throw new ForbiddenException('Only employers can search the talent pool');
    }

    const must: any[] = [];
    if (filters.q) {
      must.push({
        multi_match: {
          query: filters.q,
          fields: ['headline^3', 'summary^2', 'skills^2', 'firstName', 'lastName'],
        },
      });
    }
    if (filters.skills?.length) {
      must.push({ terms: { skills: filters.skills } });
    }
    if (filters.location) {
      must.push({ term: { location: filters.location } });
    }
    if (filters.country) {
      must.push({ term: { country: filters.country } });
    }
    if (filters.minExperience !== undefined) {
      must.push({ range: { yearsOfExperience: { gte: filters.minExperience } } });
    }
    if (filters.availability) {
      must.push({ term: { availability: filters.availability } });
    }
    if (filters.verifiedOnly) {
      must.push({
        terms: {
          verificationLevel: ['IDENTITY_VERIFIED', 'CREDENTIALS_VERIFIED', 'FULLY_VERIFIED'],
        },
      });
    }

    const result = await this.search.search(
      INDEX_CANDIDATES,
      must.length ? { bool: { must } } : { match_all: {} },
      {
        from: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
        size: filters.limit ?? 20,
      },
    );

    return { ...result, page: filters.page ?? 1, limit: filters.limit ?? 20 };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private mapDto(dto: UpdateCandidateDto) {
    return {
      headline: dto.headline,
      summary: dto.summary,
      location: dto.location,
      country: dto.country,
      yearsOfExperience: dto.yearsOfExperience,
      currentSalary: dto.currentSalary,
      expectedSalary: dto.expectedSalary,
      salaryCurrency: dto.salaryCurrency,
      availability: dto.availability as any,
      willingToRelocate: dto.willingToRelocate,
      remotePreference: dto.remotePreference as any,
      linkedinUrl: dto.linkedinUrl,
      githubUrl: dto.githubUrl,
      portfolioUrl: dto.portfolioUrl,
    };
  }

  private async indexCandidate(c: any) {
    try {
      await this.search.indexDoc(INDEX_CANDIDATES, c.id, {
        id: c.id,
        userId: c.userId,
        firstName: c.user?.firstName,
        lastName: c.user?.lastName,
        headline: c.headline,
        summary: c.summary,
        location: c.location,
        country: c.country,
        yearsOfExperience: c.yearsOfExperience,
        expectedSalary: Number(c.expectedSalary ?? 0),
        availability: c.availability,
        verificationLevel: c.verificationLevel,
        skills: c.skills?.map((s: any) => s.skill.name) ?? [],
      });
    } catch {
      /* ES may be down — don't fail the API call */
    }
  }
}
