const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ email: u.email, role: u.role, inventoryType: u.inventoryType })));
}
run().catch(console.error).finally(() => prisma.$disconnect());
