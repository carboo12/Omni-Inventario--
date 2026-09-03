import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ take: 10 });
    console.log('--- Products Sample ---');
    products.forEach(p => {
        console.log(` - ${p.name} (ID: ${p.id}, CategoryID: ${p.categoryId}, CategoryStr: ${p.category})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
