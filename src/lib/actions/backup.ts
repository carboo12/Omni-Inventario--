"use server";

import db from "../db";

export async function generateBackup() {
    try {
        const users = await db.user.findMany();
        const products = await db.product.findMany();
        const inventoryItems = await db.inventoryItem.findMany();
        const inventoryMovements = await db.inventoryMovement.findMany();
        const suppliers = await db.supplier.findMany();
        const purchaseInvoices = await db.purchaseInvoice.findMany();
        const cashRegisterSessions = await db.cashRegisterSession.findMany();
        const systemSettings = await db.systemSettings.findMany();
        const notifications = await db.notification.findMany();

        const backupData = {
            timestamp: new Date().toISOString(),
            data: {
                users,
                products,
                inventoryItems,
                inventoryMovements,
                suppliers,
                purchaseInvoices,
                cashRegisterSessions,
                systemSettings,
                notifications,
            },
        };

        return { success: true, data: JSON.stringify(backupData, null, 2) };
    } catch (error) {
        console.error("Backup generation error:", error);
        return { success: false, error: "Error al generar la copia de seguridad." };
    }
}
