import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Skills (catalog) ────────────────────────────────────────
  const skills = [
    { name: 'TypeScript', category: 'Programming' },
    { name: 'JavaScript', category: 'Programming' },
    { name: 'Python', category: 'Programming' },
    { name: 'Node.js', category: 'Programming' },
    { name: 'React', category: 'Programming' },
    { name: 'Next.js', category: 'Programming' },
    { name: 'NestJS', category: 'Programming' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'Product Management', category: 'Business' },
    { name: 'Figma', category: 'Design' },
    { name: 'UI/UX Design', category: 'Design' },
    { name: 'Sales', category: 'Business' },
    { name: 'Customer Success', category: 'Business' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      create: skill,
      update: {},
    });
  }
  console.log(`  ✓ ${skills.length} skills seeded`);

  // ─── Admin user ──────────────────────────────────────────────
  const adminEmail = 'admin@annexworkforce.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@12345', 12),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      firstName: 'Annex',
      lastName: 'Admin',
    },
  });
  console.log(`  ✓ Admin user: ${adminEmail} / Admin@12345`);

  // ─── Sample candidate ────────────────────────────────────────
  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: {},
    create: {
      email: 'candidate@example.com',
      passwordHash: await bcrypt.hash('Pass@1234', 12),
      role: 'CANDIDATE',
      status: 'ACTIVE',
      emailVerified: true,
      firstName: 'Chinedu',
      lastName: 'Okafor',
      phone: '+2348012345678',
    },
  });

  await prisma.candidate.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      headline: 'Senior Backend Engineer',
      summary: 'Backend engineer with 7 years building scalable APIs.',
      location: 'Lagos',
      country: 'NG',
      yearsOfExperience: 7,
      currentSalary: 800_000,
      expectedSalary: 1_200_000,
      salaryCurrency: 'NGN',
      availability: 'WITHIN_2_WEEKS',
      remotePreference: 'REMOTE',
      verificationLevel: 'EMAIL_VERIFIED',
    },
  });
  console.log('  ✓ Sample candidate: candidate@example.com / Pass@1234');

  // ─── Sample employer ─────────────────────────────────────────
  const employerUser = await prisma.user.upsert({
    where: { email: 'employer@techstartup.io' },
    update: {},
    create: {
      email: 'employer@techstartup.io',
      passwordHash: await bcrypt.hash('Pass@1234', 12),
      role: 'EMPLOYER',
      status: 'ACTIVE',
      emailVerified: true,
      firstName: 'Amaka',
      lastName: 'Eze',
    },
  });

  const employer = await prisma.employer.upsert({
    where: { id: 'seed-employer-1' },
    update: {},
    create: {
      id: 'seed-employer-1',
      name: 'TechStartup Inc.',
      legalName: 'TechStartup Limited',
      industry: 'Software',
      size: '11-50',
      website: 'https://techstartup.io',
      hqCountry: 'NG',
      hqCity: 'Lagos',
      isVerified: true,
      subscriptionTier: 'PRO',
    },
  });

  await prisma.employerMembership.upsert({
    where: { userId_employerId: { userId: employerUser.id, employerId: employer.id } },
    update: {},
    create: {
      userId: employerUser.id,
      employerId: employer.id,
      role: 'OWNER',
    },
  });
  console.log('  ✓ Sample employer: employer@techstartup.io / Pass@1234');

  // ─── Sample published job ────────────────────────────────────
  const tsSkill = await prisma.skill.findUnique({ where: { name: 'TypeScript' } });
  const nestSkill = await prisma.skill.findUnique({ where: { name: 'NestJS' } });

  await prisma.job.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      employerId: employer.id,
      title: 'Senior Backend Engineer (NestJS)',
      description:
        'We are looking for a senior backend engineer with strong NestJS and PostgreSQL experience to join our growing team.',
      responsibilities: 'Design and build APIs. Mentor junior engineers. Own the payroll service.',
      requirements: '5+ years backend experience. Strong TypeScript. NestJS preferred.',
      benefits: 'Remote work · Health cover · Equity · 24 days PTO',
      location: 'Lagos',
      country: 'NG',
      workArrangement: 'REMOTE',
      employmentType: 'FULL_TIME',
      seniority: 'SENIOR',
      salaryMin: 1_000_000,
      salaryMax: 1_500_000,
      salaryCurrency: 'NGN',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      isEor: true,
      skills: {
        create: [
          ...(tsSkill ? [{ skillId: tsSkill.id, required: true, minLevel: 4 }] : []),
          ...(nestSkill ? [{ skillId: nestSkill.id, required: true, minLevel: 4 }] : []),
        ],
      },
    },
  });
  console.log('  ✓ Sample job published');

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
