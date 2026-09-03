const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Checking if profitAmount exists in JewelryPiece...")

        // Add the column if it doesn't exist.
        console.log("Adding column profitAmount to JewelryPiece...")
        await prisma.$executeRawUnsafe(`
      ALTER TABLE JewelryPiece 
      ADD COLUMN profitAmount DOUBLE NOT NULL DEFAULT 0 
      AFTER calculatedPrice
    `)

        console.log("DONE: Column profitAmount added successfully.")
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
