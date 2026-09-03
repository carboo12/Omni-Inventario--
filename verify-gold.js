const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking GoldPurchase table...");
        const count = await prisma.goldPurchase.count();
        console.log("GoldPurchase count:", count);
        
        // Try to select the specific column that was missing
        const lastPurchase = await prisma.goldPurchase.findFirst({
            select: {
                id: true,
                troyOunceGrams: true
            }
        });
        console.log("Last GoldPurchase (troyOunceGrams):", lastPurchase);
        console.log("SUCCESS: Column troyOunceGrams is presence in DB.");
    } catch (e) {
        console.error("FAILED to query GoldPurchase:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
