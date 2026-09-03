import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ select: { name: true, inventoryType: true, role: true } });
    const productCount = await prisma.product.count();
    const inventoryCount = await prisma.inventoryItem.count();
    const categoryCount = await prisma.category.count();
    
    console.log('--- Database Stats ---');
    console.log('Users:', userCount);
    users.forEach(u => console.log(` - ${u.name} (${u.role}): ${u.inventoryType}`));
    console.log('Products:', productCount);
    console.log('Inventory Items:', inventoryCount);
    console.log('Categories:', categoryCount);
    
    if (inventoryCount > 0) {
        const sampleInventory = await prisma.inventoryItem.findMany({ take: 5 });
        console.log('Sample Inventory Types:', Array.from(new Set(sampleInventory.map(i => i.inventoryType))));
        console.log('Sample Inventory Quantities:', sampleInventory.map(i => i.quantity));
    }
    
    if (productCount > 0) {
        const sampleProducts = await prisma.product.findMany({ take: 5 });
        console.log('Sample Product Types:', Array.from(new Set(sampleProducts.map(p => p.inventoryType))));
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
