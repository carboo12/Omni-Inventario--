const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Checking if purchaseNumber exists in GoldPurchase...")

        // Add the column if it doesn't exist.
        // Based on schema.prisma: purchaseNumber Int @unique @default(autoincrement())
        // We'll add it as an auto-incrementing integer.
        console.log("Adding column purchaseNumber to GoldPurchase...")
        await prisma.$executeRawUnsafe(`
      ALTER TABLE GoldPurchase 
      ADD COLUMN purchaseNumber INT NOT NULL AUTO_INCREMENT UNIQUE 
      AFTER id
    `)

        console.log("DONE: Column purchaseNumber added successfully.")
    } catch (e) {
        if (e.message.includes("Duplicate column name")) {
            console.log("Column already exists, no action needed.")
        } else {
            console.error("FAILED to add column:", e.message)
        }
    } finally {
        await prisma.$disconnect()
    }
}

main()
