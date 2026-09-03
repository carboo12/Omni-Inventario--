import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.category.findMany({ take: 20 });
    console.log('--- Categories Sample ---');
    categories.forEach(c => {
        console.log(` - ${c.name} (ID: ${c.id}, Parent: ${c.parentId}, Type: ${c.inventoryType})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
