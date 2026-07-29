import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for Recommendation Traveller Lampung...');

  // Create demo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@traveller-lampung.site' },
    update: {},
    create: {
      email: 'admin@traveller-lampung.site',
      passwordHash: '$2b$12$eImiTXuWVxfM37uY4JANjO5E/n4d8R7Xh1E7gR8L8h8f1e8f1e8f1', // dummy hash for seed
      fullName: 'Administrator Pariwisata Lampung',
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Seeded Admin User: ${adminUser.email} (${adminUser.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
