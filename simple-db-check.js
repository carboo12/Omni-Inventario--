const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.appSettings.findMany();
    console.log("SETTINGS:", JSON.stringify(settings));
}

main().catch(console.error).finally(() => prisma.$disconnect());
