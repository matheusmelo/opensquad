const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.authUser.upsert({
      where: { email: 'admin@opensquad.dev' },
      update: { email: 'admin@opensquad.dev' },
      create: {
        email: 'admin@opensquad.dev',
        passwordHash: adminPasswordHash,
        name: 'Admin',
        role: 'admin'
      }
    });
    console.log('✅ Admin user created:', admin.email);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();