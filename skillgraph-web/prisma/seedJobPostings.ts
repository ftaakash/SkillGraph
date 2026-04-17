import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);

  console.log(`Seeding jobs for week ${currentWeek}...`);

  const mockJobs = [
    {
      company: 'TechCorp',
      role: 'Full Stack Dev',
      requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      rawDescription: 'Looking for a full stack dev.',
      demandWeek: currentWeek,
    },
    {
      company: 'TechCorp',
      role: 'Full Stack Dev',
      requiredSkills: ['React', 'Next.js', 'Tailwind', 'TypeScript'],
      rawDescription: 'Looking for a full stack dev.',
      demandWeek: currentWeek,
    },
    {
      company: 'DataSys',
      role: 'Data Analyst',
      requiredSkills: ['Python', 'SQL', 'Tableau', 'Excel'],
      rawDescription: 'Data analyst position.',
      demandWeek: currentWeek,
    },
    {
      company: 'AI Init',
      role: 'ML Engineer',
      requiredSkills: ['Python', 'PyTorch', 'TensorFlow', 'Docker'],
      rawDescription: 'ML Eng pos.',
      demandWeek: currentWeek,
    },
    {
      company: 'CloudNet',
      role: 'DevOps Engineer',
      requiredSkills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
      rawDescription: 'DevOps role.',
      demandWeek: currentWeek,
    },
    {
      company: 'StartupX',
      role: 'Industrial AI Engineer',
      requiredSkills: ['Python', 'C++', 'Computer Vision', 'PyTorch'],
      rawDescription: 'Industrial AI role.',
      demandWeek: currentWeek,
    },
    {
      company: 'FinTech',
      role: 'Backend Developer',
      requiredSkills: ['Node.js', 'MongoDB', 'Redis', 'Express'],
      rawDescription: 'Backend role.',
      demandWeek: currentWeek,
    },
    {
      company: 'Ecom',
      role: 'Frontend Developer',
      requiredSkills: ['React', 'Redux', 'TypeScript', 'CSS'],
      rawDescription: 'Frontend role.',
      demandWeek: currentWeek,
    },
    {
      company: 'TechCorp',
      role: 'Full Stack Dev',
      requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
      rawDescription: 'Looking for a full stack dev.',
      demandWeek: currentWeek,
    },
    {
      company: 'TechCorp',
      role: 'Full Stack Dev',
      requiredSkills: ['React', 'Node.js', 'GraphQL', 'TypeScript'],
      rawDescription: 'Looking for a full stack dev.',
      demandWeek: currentWeek,
    }
  ];

  for (let i = 0; i < 50; i++) {
    const base = mockJobs[Math.floor(Math.random() * mockJobs.length)];
    await prisma.jobPosting.create({
      data: {
        ...base,
      }
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
