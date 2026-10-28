const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const p = await prisma.product.findFirst({ where: { name: { contains: 'ARROZ 80/20' } } });
  console.log('Product:', p);
  if(p) {
    const inv = await prisma.inventoryItem.findMany({ where: { productId: p.id } });
    console.log('Inventory:', inv);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
