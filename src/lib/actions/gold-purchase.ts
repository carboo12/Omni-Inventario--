"use server";

import db from "../db";
import { GoldPricingEngine, PricingInput } from "../services/gold-pricing-engine";
import { GoldInventoryService } from "../services/gold-inventory-service";
import { FinancialService } from "../services/financial-service";
import { revalidatePath } from "next/cache";

/**
 * Saves a new gold purchase transaction with audit logging.
 */
export async function saveGoldPurchase(input: {
    customerId: string;
    userId: string;
    grossWeightGrams: number;
    purityPercent: number;
    marketPricePerOunce: number;
    marginPercent?: number;
    exchangeRate?: number;
    troyOunceGrams?: number;
}) {
    try {
        // 1. Calculate final values using the Pricing Engine
        const pricingResult = GoldPricingEngine.calculate({
            grossWeightGrams: input.grossWeightGrams,
            purityPercent: input.purityPercent,
            marketPricePerOunce: input.marketPricePerOunce,
            marginPercent: input.marginPercent,
            exchangeRate: input.exchangeRate,
            troyOunceGrams: input.troyOunceGrams,
        });

        if (!pricingResult) {
            throw new Error("Parámetros de cálculo inválidos");
        }

        // 2. Execute Transaction
        const purchase = await db.$transaction(async (tx: any) => {
            // Create the purchase record
            const newPurchase = await tx.goldPurchase.create({
                data: {
                    customerId: input.customerId,
                    grossWeightGrams: input.grossWeightGrams,
                    purityPercent: input.purityPercent,
                    fineGoldGrams: pricingResult.fineGoldGrams,
                    fineGoldOunces: pricingResult.fineGoldOunces,
                    karatEquivalent: pricingResult.karatEquivalent,
                    marketPriceUsed: input.marketPricePerOunce,
                    valueUSD: pricingResult.valueUSD,
                    exchangeRate: input.exchangeRate || 1,
                    valueLocalCurrency: pricingResult.valueLocalCurrency,
                    marginPercent: input.marginPercent || 0,
                    finalPaidAmount: pricingResult.finalPaidAmount,
                    troyOunceGrams: input.troyOunceGrams,
                    status: "IN_STOCK",
                },
            });

            // 3. Update Gold Stock and Record Movement
            await GoldInventoryService.adjustStock(tx, {
                karat: Math.round(pricingResult.karatEquivalent), // Precision adjustment for stock category
                grams: input.grossWeightGrams,
                type: "PURCHASE",
                referenceId: newPurchase.id,
                userId: input.userId,
            });

            // 4. Record Financial Expense
            await FinancialService.record(tx, {
                type: "EXPENSE",
                amount: pricingResult.finalPaidAmount,
                referenceId: newPurchase.id,
                description: `Compra de oro: ${input.grossWeightGrams}g (${pricingResult.karatEquivalent}K) - Cliente ID: ${input.customerId}`,
            });

            // 5. Log the audit
            await tx.auditLog.create({
                data: {
                    userId: input.userId,
                    action: "CREATE_GOLD_PURCHASE",
                    entity: "GoldPurchase",
                    entityId: newPurchase.id,
                },
            });

            // 6. Update Gold Market Price history
            await (tx as any).goldMarketPrice.create({
                data: {
                    pricePerOunceUSD: input.marketPricePerOunce,
                },
            });

            return newPurchase;
        });

        revalidatePath("/jewelry/inventory");
        revalidatePath("/dashboard");

        return { success: true, data: purchase };
    } catch (error: any) {
        console.error("Error saving gold purchase:", error);
        return { success: false, error: error.message || "Error interno al guardar la compra" };
    }
}

/**
 * Retrieves the latest recorded gold market price.
 */
export async function getLatestGoldPrice() {
    try {
        const latest = await (db as any).goldMarketPrice.findFirst({
            orderBy: { createdAt: "desc" },
        });
        return { success: true, price: latest?.pricePerOunceUSD || 0 };
    } catch (error) {
        console.error("Error fetching latest gold price:", error);
        return { success: false, error: "Error al obtener el precio del mercado" };
    }
}

/**
 * Gets the purchase history.
 */
export async function getGoldPurchaseHistory(limit = 10) {
    try {
        const history = await db.goldPurchase.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                customer: {
                    select: { fullName: true },
                },
            },
        });
        return { success: true, data: history };
    } catch (error) {
        console.error("Error fetching gold purchase history:", error);
        return { success: false, error: "Error al obtener el historial de compras" };
    }
}
