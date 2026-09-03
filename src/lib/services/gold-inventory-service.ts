import { Prisma } from "@prisma/client";
import db from "../db";

/**
 * GoldInventoryService
 * Handles all logic related to physical gold stock management.
 */
export class GoldInventoryService {
    /**
     * Adjusts stock for a specific karat and records the movement.
     * Unified with the general Kardex.
     * MUST be called within an existing Prisma transaction.
     */
    public static async adjustStock(
        tx: Prisma.TransactionClient,
        data: {
            karat: number;
            grams: number; // positive for addition, negative for subtraction
            type: "PURCHASE" | "MELT" | "TRANSFORMATION" | "SALE" | "ADJUSTMENT";
            referenceId: string;
            userId: string;
        }
    ) {
        const { karat, grams, type, referenceId, userId } = data;

        // 1. Get Previous Quantity
        const currentStock = await tx.goldStock.findUnique({
            where: { karat },
        });
        const previousQuantity = currentStock?.gramsAvailable || 0;

        // 2. Update or Create Stock record
        const stock = await tx.goldStock.upsert({
            where: { karat },
            update: {
                gramsAvailable: { increment: grams },
            },
            create: {
                karat,
                gramsAvailable: grams,
            },
        });

        // 3. Safety check: No negative grams
        if (stock.gramsAvailable < 0) {
            throw new Error(`Inventario insuficiente para oro de ${karat}K. Disponible: ${stock.gramsAvailable - grams}g.`);
        }

        // 4. Record Gold-specific Movement
        await tx.goldMovement.create({
            data: {
                type,
                referenceId,
                karat,
                grams,
            },
        });

        // 5. Record Unified Industry Kardex (InventoryMovement)
        // This ensures visibility in the main Kardex view
        const movementTypeMap: Record<string, string> = {
            "PURCHASE": "Ingreso",
            "SALE": "Venta",
            "MELT": "Ajuste",
            "TRANSFORMATION": "Ajuste",
            "ADJUSTMENT": "Ajuste"
        };

        await tx.inventoryMovement.create({
            data: {
                timestamp: new Date().toISOString(),
                productName: `Oro ${karat}K`,
                movementType: movementTypeMap[type] || "Ajuste",
                movementId: referenceId,
                quantityChange: grams,
                previousQuantity: previousQuantity,
                newQuantity: stock.gramsAvailable,
                userId: userId,
                inventoryType: "jewelry"
            }
        });

        return stock;
    }

    /**
     * Gets current available grams for a karat.
     */
    public static async getAvailableGrams(karat: number): Promise<number> {
        const stock = await db.goldStock.findUnique({
            where: { karat },
        });
        return stock?.gramsAvailable || 0;
    }
}
