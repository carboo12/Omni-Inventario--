const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma models...');
    try {
        console.log('App Settings:', !!prisma.appSettings);
        console.log('Gold Purchase:', !!prisma.goldPurchase);
        console.log('Gold Market Price:', !!prisma.goldMarketPrice);
        console.log('Financial Transaction:', !!prisma.financialTransaction);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
