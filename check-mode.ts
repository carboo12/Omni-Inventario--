import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.appSettings.findMany();
    console.log("Settings in DB:", settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
