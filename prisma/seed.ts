
import { PrismaClient } from '@prisma/client';
import { products, inventory, managedUsers, inventoryMovements, suppliers, purchaseInvoices, cashRegisterSessions } from '../src/lib/data.ts';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Seed Users
    for (const user of managedUsers) {
        // Hash password if it's not already hashed (simple check, or just hash it)
        // Since we know data.ts has plain text, we hash it.
        // We need to import bcrypt.
        // But wait, we can't easily import bcrypt in seed.ts if it's a module?
        // Let's try to use the same bcryptjs as auth.ts
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(user.password, 10);

        await prisma.user.upsert({
            where: { id: user.id },
            update: {
                password: hashedPassword // Update password if user exists too
            },
            create: {
                id: user.id,
                name: user.name,
                role: user.role,
                password: hashedPassword,
                status: user.status,
                inventoryType: user.inventoryType,
            },
        });
    }

    // Seed Products
    for (const product of products) {
        await prisma.product.upsert({
            where: { id: product.id },
            update: {},
            create: {
                id: product.id,
                name: product.name,
                priceNIO: product.priceNIO,
                costPriceNIO: product.costPriceNIO,
                category: product.category,
                inventoryType: product.inventoryType,
                unitOfMeasure: product.unitOfMeasure,
                minStock: product.minStock,
                barcode: product.barcode,
                imageUrl: product.imageUrl,
                imageHint: product.imageHint,
            },
        });
    }

    // Seed Inventory Items
    for (const item of inventory) {
        await prisma.inventoryItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                inventoryType: item.inventoryType,
                barcode: item.barcode,
                batch: item.batch,
                quantity: item.quantity,
                expiryDate: item.expiryDate,
                status: item.status,
            },
        });
    }

    // Seed Suppliers
    for (const supplier of suppliers) {
        await prisma.supplier.upsert({
            where: { id: supplier.id },
            update: {},
            create: {
                id: supplier.id,
                name: supplier.name,
                nit: supplier.nit,
                phone: supplier.phone,
                email: supplier.email,
                address: supplier.address,
                city: supplier.city,
            },
        });
    }

    // Seed Purchase Invoices
    for (const invoice of purchaseInvoices) {
        await prisma.purchaseInvoice.upsert({
            where: { id: invoice.id },
            update: {},
            create: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                supplierId: invoice.supplierId,
                supplierName: invoice.supplierName,
                date: invoice.date,
                dueDate: invoice.dueDate,
                totalAmount: invoice.totalAmount,
                paidAmount: invoice.paidAmount,
                status: invoice.status,
                details: invoice.details,
            },
        });
    }

    // Seed Cash Register Sessions
    for (const session of cashRegisterSessions) {
        await prisma.cashRegisterSession.upsert({
            where: { id: session.id },
            update: {},
            create: {
                id: session.id,
                cashierId: session.cashierId,
                cashierName: session.cashierName,
                openingTime: session.openingTime,
                closingTime: session.closingTime,
                initialAmount: session.initialAmount,
                finalAmount: session.finalAmount,
                totalSales: session.totalSales,
                status: session.status,
            },
        });
    }

    // Seed Inventory Movements
    // Note: Inventory movements reference users, so users must be seeded first
    for (const movement of inventoryMovements) {
        // Find the user ID based on the name since the mock data uses name for 'user' field but schema uses relation
        // In a real scenario we would map IDs. Here we will try to find the user by name.
        const user = managedUsers.find(u => u.name === movement.user);
        if (user) {
            await prisma.inventoryMovement.upsert({
                where: { id: movement.id },
                update: {},
                create: {
                    id: movement.id,
                    timestamp: movement.timestamp,
                    productName: movement.productName,
                    movementType: movement.movementType,
                    movementId: movement.movementId,
                    quantityChange: movement.quantityChange,
                    previousQuantity: movement.previousQuantity,
                    newQuantity: movement.newQuantity,
                    userId: user.id,
                    inventoryType: movement.inventoryType,
                }
            })
        }
    }

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
