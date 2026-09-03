import { Prisma } from "@prisma/client";
import { GoldInventoryService } from "./gold-inventory-service";

/**
 * Generates the next available sequential piece code (e.g. "1001", "1002", ...)
 */
async function generateNextCode(tx: Prisma.TransactionClient): Promise<string> {
    const lastPiece = await tx.jewelryPiece.findFirst({
        orderBy: { createdAt: "desc" },
        select: { code: true },
    });

    let nextCode = "1001";
    if (lastPiece?.code && !isNaN(Number(lastPiece.code))) {
        nextCode = (Number(lastPiece.code) + 1).toString();
    }
    return nextCode;
}

/**
 * JewelryProductionService
 * Logic for creating jewelry pieces in two ways:
 *  1. transform() - Consume gold stock → create piece (production flow)
 *  2. directEntry() - Register an existing piece without consuming gold (manual inventory entry)
 */
export class JewelryProductionService {
    /**
     * Transforms gold grams into one or more identical Jewelry Pieces.
     * Supports quantity > 1 to batch-create pieces with the same specs.
     */
    public static async transform(
        tx: Prisma.TransactionClient,
        data: {
            name: string;
            karat: number;
            gramsUsed: number;
            laborCost: number;
            marginPercent: number;
            marketPriceUsed: number;
            calculatedPrice: number;
            profitAmount: number;
            photoUrl?: string;
            userId: string;
            quantity?: number; // how many identical pieces to create
            materialId?: string | null;
            location?: string;
        }
    ) {
        const quantity = Math.max(1, data.quantity ?? 1);
        const totalGramsUsed = data.gramsUsed * quantity;

        // 1. Reduce Gold Stock once for all pieces in the batch
        // We need to adjust stock BEFORE creating pieces to avoid race conditions
        // Use a temporary placeholder — will be linked after piece creation
        const pieces = [];

        for (let i = 0; i < quantity; i++) {
            const nextCode = await generateNextCode(tx);

            // Create the Jewelry Piece
            const piece = await tx.jewelryPiece.create({
                data: {
                    code: nextCode,
                    name: data.name,
                    weight: data.gramsUsed,
                    karat: data.karat,
                    laborCost: data.laborCost,
                    marginPercent: data.marginPercent,
                    calculatedPrice: data.calculatedPrice,
                    profitAmount: data.profitAmount,
                    marketPriceUsed: data.marketPriceUsed,
                    photoUrl: data.photoUrl,
                    materialId: data.materialId,
                    location: data.location || "A",
                    status: "AVAILABLE",
                },
            });

            // Document the Transformation
            await tx.goldTransformation.create({
                data: {
                    karat: data.karat,
                    gramsUsed: data.gramsUsed,
                    resultingPieceId: piece.id,
                },
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    userId: data.userId,
                    action: "GOLD_TRANSFORMATION",
                    entity: "JewelryPiece",
                    entityId: piece.id,
                },
            });

            pieces.push(piece);
        }

        // Reduce Gold Stock once for all pieces
        await GoldInventoryService.adjustStock(tx, {
            karat: data.karat,
            grams: -totalGramsUsed,
            type: "TRANSFORMATION",
            referenceId: pieces[0].id,
            userId: data.userId,
        });

        return pieces;
    }

    /**
     * Directly registers existing physical jewelry pieces into inventory
     * WITHOUT consuming any gold stock. For pieces that already exist.
     * Supports quantity > 1 to batch-register identical pieces.
     */
    public static async directEntry(
        tx: Prisma.TransactionClient,
        data: {
            name: string;
            karat: number;
            weight: number;
            laborCost: number;
            marginPercent: number;
            calculatedPrice: number;
            profitAmount: number;
            photoUrl?: string;
            userId: string;
            quantity?: number;
            materialId?: string | null;
            location?: string;
        }
    ) {
        const quantity = Math.max(1, data.quantity ?? 1);
        const pieces = [];

        for (let i = 0; i < quantity; i++) {
            const nextCode = await generateNextCode(tx);

            const piece = await tx.jewelryPiece.create({
                data: {
                    code: nextCode,
                    name: data.name,
                    weight: data.weight,
                    karat: data.karat,
                    laborCost: data.laborCost,
                    marginPercent: data.marginPercent,
                    calculatedPrice: data.calculatedPrice,
                    profitAmount: data.profitAmount,
                    marketPriceUsed: 0, // No market price used in direct entry
                    photoUrl: data.photoUrl,
                    materialId: data.materialId,
                    location: data.location || "A",
                    status: "AVAILABLE",
                },
            });

            await tx.auditLog.create({
                data: {
                    userId: data.userId,
                    action: "DIRECT_INVENTORY_ENTRY",
                    entity: "JewelryPiece",
                    entityId: piece.id,
                },
            });

            pieces.push(piece);
        }

        return pieces;
    }
}
