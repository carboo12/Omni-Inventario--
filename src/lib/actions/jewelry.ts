"use server"
import { generateUUID } from '@/lib/uuid';

import db from "@/lib/db";
import { BusinessGuard } from "../business-guard";
import { JewelryPricingEngine, PricingParams } from "../modules/jewelry/pricing-engine";

export async function createJewelryPiece(
    name: string,
    weight: number,
    karat: number,
    laborCost: number,
    margin: number,
    currentGoldPrice: number, // 24k base
    userId: string,
    photoUrl?: string,
    consumeFromStock: boolean = true // if true, it will consume grams from GoldStock
) {
    await BusinessGuard.assertMode('JEWELRY');

    const params: PricingParams = { weight, karat, laborCost, margin, currentGoldPrice };
    const calculatedPrice = JewelryPricingEngine.calculatePiecePrice(params);

    return await db.$transaction(async (tx) => {
        // Decrementar el stock si se requirió
        if (consumeFromStock) {
            const stock = await tx.goldStock.findUnique({ where: { karat } });
            if (!stock || stock.gramsAvailable < weight) {
                throw new Error(`No hay suficiente stock de oro de ${karat}k para crear la pieza (${stock?.gramsAvailable || 0}g disponibles, ${weight}g requeridos).`);
            }

            await tx.goldStock.update({
                where: { karat },
                data: { gramsAvailable: { decrement: weight } }
            });
        }

        const piece = await tx.jewelryPiece.create({
            data: {
                id: generateUUID(),
                name,
                weight,
                karat,
                laborCost,
                marginPercent: margin,
                calculatedPrice,
                marketPriceUsed: currentGoldPrice,
                photoUrl,
                status: 'AVAILABLE'
            } as any
        });

        await tx.auditLog.create({
            data: {
                id: generateUUID(),
                userId,
                action: 'JEWELRY_PIECE_CREATED',
                entity: 'JewelryPiece',
                entityId: piece.id
            } as any
        });

        return piece;
    });
}

export async function sellJewelryPiece(pieceId: string, customerId: string, finalPrice: number, userId: string) {
    await BusinessGuard.assertMode('JEWELRY');

    return await db.$transaction(async (tx) => {
        const settings = await tx.systemSettings.findFirst();
        const rate = parseFloat(settings?.exchangeRate || "36.5");
        const finalPriceNIO = Math.round(finalPrice * rate * 100) / 100;

        const piece = await tx.jewelryPiece.update({
            where: { id: pieceId },
            data: { status: 'SOLD' }
        });

        // Generate sales invoice specifically for this piece!
        // This integrates with the standard invoice model.
        const invoice = await tx.salesInvoice.create({
            data: {
                id: generateUUID(),
                totalAmount: finalPriceNIO,
                paymentMethod: 'Efectivo',
                status: 'COMPLETED',
                userId,
                customerId,
                sessionId: 'DEFAULT',
                salesInvoiceItem: {
                    create: [{
                        id: generateUUID(),
                        productId: piece.id,
                        productName: piece.name,
                        quantity: 1,
                        unitPrice: finalPriceNIO,
                        totalPrice: finalPriceNIO,
                        priceLevel: 0
                    }]
                }
            } as any
        });

        await tx.auditLog.create({
            data: {
                id: generateUUID(),
                userId,
                action: 'JEWELRY_PIECE_SOLD',
                entity: 'JewelryPiece',
                entityId: piece.id
            } as any
        });

        return invoice;
    });
}

export async function revertJewelrySale(pieceId: string, masterCode: string, userId: string) {
    await BusinessGuard.assertMode('JEWELRY');

    try {
        // 1. Verify master code
        const settings = await db.systemSettings.findFirst();
        if (!settings || settings.recoveryKey !== masterCode) {
            return { success: false, error: 'Código maestro incorrecto.' };
        }

        // 2. Revert piece status
        const piece = await db.jewelryPiece.findUnique({ where: { id: pieceId } });
        if (!piece) return { success: false, error: 'Pieza no encontrada.' };
        if (piece.status !== 'SOLD') return { success: false, error: 'La pieza no está marcada como vendida.' };

        await db.$transaction(async (tx) => {
            await tx.jewelryPiece.update({
                where: { id: pieceId },
                data: { status: 'AVAILABLE' }
            });

            // 3. Mark the related sales invoice as void or similar?
            // For now, at least mark the audit log
            await tx.auditLog.create({
                data: {
                    id: generateUUID(),
                    userId,
                    action: 'JEWELRY_PIECE_REVERTED',
                    entity: 'JewelryPiece',
                    entityId: pieceId
                } as any
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Error reverting jewelry sale:', error);
        return { success: false, error: 'Error al revertir la venta.' };
    }
}
