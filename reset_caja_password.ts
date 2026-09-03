import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'caja1';
    const newPassword = '123456'; // The password the user wants

    console.log(`Resetting password for user: ${username}...`);

    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Update the user
    try {
        const existingUser = await prisma.user.findFirst({
            where: { name: username }
        });

        if (!existingUser) {
            console.error(`ERROR: User '${username}' not found.`);
            return;
        }

        const user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                password: hashedPassword,
            },
        });
        console.log(`SUCCESS: Password for '${username}' has been updated/hashed successfully.`);
        console.log(`New Hash: ${hashedPassword}`);
    } catch (error) {
        console.error(`ERROR: Could not update user '${username}'.`, error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
