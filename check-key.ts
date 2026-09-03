
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.systemSettings.findFirst();
    console.log('Current Settings:', settings);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
