"use server";

import db from "../db";
import { JewelrySalesService } from "../services/jewelry-sales-service";
import { revalidatePath } from "next/cache";
import { createInventoryMovement } from "./inventory";

/**
 * Processes the sale of a jewelry piece to a customer.
 */
export async function sellJewelryPiece(input: {
    userId: string;
    pieceId: string;
    customerId: string;
    salePrice: number;
    paymentMethod: string;
    sessionId?: string | null;
}) {
    try {
        // Fetch piece before sale to get its name
        const piece = await db.jewelryPiece.findUnique({ where: { id: input.pieceId } });

        const result = await db.$transaction(async (tx) => {
            return await JewelrySalesService.sell(tx, input);
        });


        // Log the sale as an inventory movement
        if (piece) {
            await createInventoryMovement({
                productId: piece.id,
                productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
                movementType: 'Venta',
                quantityChange: -1,
                previousQuantity: 1,
                newQuantity: 0,
                user: input.userId,
                inventoryType: 'jewelry',
                movementId: piece.id,
            });
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/sales");
        revalidatePath("/dashboard");
        revalidatePath("/kardex");

        return {
            success: true,
            data: result.piece,
            invoiceNumber: result.invoiceNumber
        };
    } catch (error: any) {
        console.error("Error selling jewelry piece:", error);
        return { success: false, error: error.message || "Error al procesar la venta" };
    }
}

/**
 * Processes the sale of multiple jewelry pieces to a customer.
 */
export async function sellMultipleJewelryPieces(input: {
    userId: string;
    cartItems: { pieceId: string; salePrice: number }[];
    customerId: string;
    totalSalePrice: number;
    paymentMethod: string;
    sessionId?: string | null;
}) {
    try {
        const result = await db.$transaction(async (tx) => {
            return await JewelrySalesService.sellMultiple(tx, input);
        });

        const pieces = result.pieces as any[];

        // Log the sale as an inventory movement for each piece
        for (const piece of pieces) {
            await createInventoryMovement({
                productId: piece.id,
                productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
                movementType: 'Venta',
                quantityChange: -1,
                previousQuantity: 1,
                newQuantity: 0,
                user: input.userId,
                inventoryType: 'jewelry',
                movementId: piece.id,
            });
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/sales");
        revalidatePath("/dashboard");
        revalidatePath("/kardex");

        return {
            success: true,
            data: result.pieces,
            invoiceNumber: result.invoiceNumber
        };
    } catch (error: any) {
        console.error("Error selling jewelry pieces:", error);
        return { success: false, error: error.message || "Error al procesar la venta" };
    }
}

/**
 * Gets the sales history for jewelry.
 */
export async function getJewelrySalesHistory(limit = 10) {
    try {
        const history = await db.jewelryPiece.findMany({
            where: { status: "SOLD" },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return { success: true, data: history };
    } catch (error) {
        return { success: false, error: "Error al obtener historial de ventas" };
    }
}
