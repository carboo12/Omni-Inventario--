const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const settings = await prisma.appSettings.findMany();
        console.log('--- SETTINGS START ---');
        console.log(JSON.stringify(settings, null, 2));
        console.log('--- SETTINGS END ---');
    } catch (error) {
        console.error('Error querying AppSettings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
