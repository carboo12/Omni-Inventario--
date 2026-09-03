import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.appSettings.findMany();
    console.log("ALL AppSettings in DB:", JSON.stringify(settings, null, 2));

    const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, inventoryType: true }
    });
    console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
