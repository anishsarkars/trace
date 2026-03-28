const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    const userCount = await prisma.user.count();
    console.log(`Connected successfully! User count: ${userCount}`);
  } catch (err) {
    console.error("Database connection failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
