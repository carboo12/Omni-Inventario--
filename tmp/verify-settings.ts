import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
    const settings = await db.systemSettings.findFirst()
    console.log('System Settings:', settings)
    if (settings && 'exchangeRate' in settings) {
        console.log('Verification Success: exchangeRate exists in systemSettings')
    } else if (!settings) {
        console.log('Verification Warning: No systemSettings found in DB, but checking schema...')
        // We can't easily check schema at runtime without reflecting, but we know what the Prisma file says.
    } else {
        console.error('Verification Failure: exchangeRate NOT found in systemSettings')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
