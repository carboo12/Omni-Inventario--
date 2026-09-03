"use server"

import db from "@/lib/db";
import { BusinessGuard } from "../business-guard";
import { JewelryPricingEngine } from "../modules/jewelry/pricing-engine";
import { searchOrCreateCustomer } from "./customers";

export async function buyGold(
    customerName: string,
    grossWeight: number,
    karat: number,
    marketPrice: number, // Precio por gramo de oro 24k en este momento
    userId: string
) {
    await BusinessGuard.assertMode('JEWELRY');

    if (!customerName || customerName.trim() === '') {
        throw new Error('Customer is required for gold purchase.');
    }

    const pricePerGram = JewelryPricingEngine.getPricePerGram(karat, marketPrice);
    const pureGoldWeight = JewelryPricingEngine.getPureGoldWeight(grossWeight, karat);
    const totalPaid = grossWeight * pricePerGram;

    // Todo en una sola transacción para consistencia (FASE 5)
    return await db.$transaction(async (tx) => {
        const customer = await searchOrCreateCustomer(customerName);

        const goldPurchase = await tx.goldPurchase.create({
            data: {
                customerId: customer.id,
                grossWeight,
                karat,
                pureGoldWeight,
                marketPrice,
                pricePerGram,
                totalPaid,
                status: 'IN_STOCK'
            }
        });

        // Upsert GoldStock
        const existingStock = await tx.goldStock.findUnique({
            where: { karat }
        });

        if (existingStock) {
            await tx.goldStock.update({
                where: { karat },
                data: { gramsAvailable: { increment: grossWeight } }
            });
        } else {
            await tx.goldStock.create({
                data: { karat, gramsAvailable: grossWeight }
            });
        }

        // FASE 11: AuditLog
        await tx.auditLog.create({
            data: {
                userId,
                action: 'GOLD_PURCHASE',
                entity: 'GoldPurchase',
                entityId: goldPurchase.id
            }
        });

        return goldPurchase;
    });
}

export async function meltGold(purchaseId: string, userId: string) {
    await BusinessGuard.assertMode('JEWELRY');

    return await db.$transaction(async (tx) => {
        const purchase = await tx.goldPurchase.findUnique({ where: { id: purchaseId } });
        if (!purchase) throw new Error("Purchase not found");
        if (purchase.status !== 'IN_STOCK') throw new Error("Only IN_STOCK gold can be melted");

        const updated = await tx.goldPurchase.update({
            where: { id: purchaseId },
            data: { status: 'MELTED' }
        });

        // Melting gold removes it from the usable GoldStock (or moves it to a MELTED pool, but based on requirements, it decreases stock if it's transformed, but melting might just change state. Wait, plan says "Se funde oro -> disminuye GoldStock". Let's apply it)
        await tx.goldStock.update({
            where: { karat: purchase.karat },
            data: { gramsAvailable: { decrement: purchase.grossWeight } }
        });

        await tx.auditLog.create({
            data: {
                userId,
                action: 'GOLD_MELTED',
                entity: 'GoldPurchase',
                entityId: purchaseId
            }
        });

        return updated;
    });
}
