import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('DemoPass1');

  const user = await prisma.user.upsert({
    where: { email: 'demo@jobqueue.dev' },
    update: {},
    create: {
      email: 'demo@jobqueue.dev',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      memberships: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  console.log('Seeded:', { user: user.email, organization: organization.slug });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
