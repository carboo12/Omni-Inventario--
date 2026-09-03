"use server";

import db from "../db";
import { JewelryProductionService } from "../services/jewelry-production-service";
import { revalidatePath } from "next/cache";
import { createInventoryMovement } from "./inventory";
import { verifySession } from "../session";

/**
 * Transforms gold stock into finished jewelry piece(s).
 * Supports quantity > 1 to batch-create identical pieces from gold stock.
 */
export async function createJewelryPiece(input: {
    userId: string;
    name: string;
    karat: number;
    gramsUsed: number;
    laborCost: number;
    marginPercent: number;
    marketPriceUsed: number;
    calculatedPrice: number;
    profitAmount: number;
    photoUrl?: string;
    quantity?: number;
    materialId?: string | null;
    location?: string;
}) {
    try {
        const pieces = await db.$transaction(async (tx) => {
            return await JewelryProductionService.transform(tx, input);
        });

        // Log each piece creation as an inventory movement
        for (const piece of pieces) {
            await createInventoryMovement({
                productId: piece.id,
                productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
                movementType: 'Entrada',
                quantityChange: 1,
                previousQuantity: 0,
                newQuantity: 1,
                user: input.userId,
                inventoryType: 'jewelry',
                movementId: piece.id,
            });
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/jewelry/sales");
        revalidatePath("/kardex");

        return { success: true, data: pieces };
    } catch (error: any) {
        console.error("Error creating jewelry piece:", error);
        return { success: false, error: error.message || "Error al transformar el oro" };
    }
}

/**
 * Directly adds existing jewelry pieces to inventory WITHOUT consuming gold stock.
 * Use this when registering pieces that already exist physically.
 * Supports quantity > 1 to batch-register identical pieces.
 */
export async function addJewelryToInventory(input: {
    userId: string;
    name: string;
    karat: number;
    weight: number;
    laborCost: number;
    marginPercent: number;
    calculatedPrice: number;
    profitAmount: number;
    photoUrl?: string;
    quantity?: number;
    materialId?: string | null;
    location?: string;
}) {
    try {
        const pieces = await db.$transaction(async (tx) => {
            return await JewelryProductionService.directEntry(tx, input);
        });

        // Log each piece creation as an inventory movement (direct entry)
        for (const piece of pieces) {
            await createInventoryMovement({
                productId: piece.id,
                productName: `${piece.name} (${piece.code || piece.id.slice(-6)})`,
                movementType: 'Entrada',
                quantityChange: 1,
                previousQuantity: 0,
                newQuantity: 1,
                user: input.userId,
                inventoryType: 'jewelry',
                movementId: piece.id,
            });
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/jewelry/sales");
        revalidatePath("/kardex");

        return { success: true, data: pieces };
    } catch (error: any) {
        console.error("Error adding jewelry to inventory:", error);
        return { success: false, error: error.message || "Error al ingresar piezas al inventario" };
    }
}

/**
 * Gets all available jewelry pieces (for inventory and sales).
 */
export async function getAvailableJewelry() {
    try {
        const [settings, allAvailablePieces] = await Promise.all([
            db.systemSettings.findFirst(),
            db.jewelryPiece.findMany({
                where: { status: "AVAILABLE" },
                orderBy: { createdAt: "desc" },
            })
        ]);

        const mode = settings?.jewelryLocationMode || "HOME";

        let filteredPieces = allAvailablePieces;
        if (mode === "STORE_A") {
            filteredPieces = allAvailablePieces.filter(p => p.location === "A");
        } else if (mode === "STORE_B") {
            filteredPieces = allAvailablePieces.filter(p => p.location === "B");
        }

        return { success: true, data: filteredPieces };
    } catch (error) {
        console.error("Error fetching available jewelry:", error);
        return { success: false, error: "Error al obtener inventario de piezas" };
    }
}

/**
 * Gets the current gold stock by karat.
 */
export async function getGoldStock() {
    try {
        const stocks = await db.goldStock.findMany({
            orderBy: { karat: "desc" },
        });
        return { success: true, data: stocks };
    } catch (error) {
        console.error("Error fetching gold stock:", error);
        return { success: false, error: "Error al obtener stock de oro" };
    }
}

/**
 * Updates an existing jewelry piece (e.g., photo, name, weight, material).
 */
export async function updateJewelryPiece(id: string, input: {
    code?: string | null;
    name?: string;
    weight?: number;
    karat?: number;
    laborCost?: number;
    marginPercent?: number;
    calculatedPrice?: number;
    profitAmount?: number;
    photoUrl?: string;
    materialId?: string | null;
    status?: any;
}) {
    try {
        // Clean and prepare data for Prisma
        const data: any = {};
        if (input.code !== undefined) data.code = input.code;
        if (input.name !== undefined) data.name = input.name;
        if (input.weight !== undefined) data.weight = input.weight;
        if (input.karat !== undefined) data.karat = input.karat;
        if (input.laborCost !== undefined) data.laborCost = input.laborCost;
        if (input.marginPercent !== undefined) data.marginPercent = input.marginPercent;
        if (input.calculatedPrice !== undefined) data.calculatedPrice = input.calculatedPrice;
        if (input.profitAmount !== undefined) data.profitAmount = input.profitAmount;
        if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;
        if (input.materialId !== undefined) data.materialId = input.materialId;

        const piece = await db.jewelryPiece.update({
            where: { id },
            data,
        });

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/jewelry/sales");

        return { success: true, data: piece };
    } catch (error: any) {
        console.error("Error updating jewelry piece:", error);
        return { success: false, error: error.message || "Error al actualizar la pieza" };
    }
}

/**
 * Securely deletes a jewelry piece.
 * Requires the master-admin password (recoveryKey) and reorders subsequent codes.
 */
export async function deleteJewelryPiece(id: string, password: string) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const settings = await db.systemSettings.findFirst();
        if (!settings || settings.recoveryKey !== password) {
            return { success: false, error: 'Llave Maestra incorrecta' };
        }

        const pieceToDelete = await db.jewelryPiece.findUnique({
            where: { id },
            select: { code: true }
        });

        if (!pieceToDelete) {
            return { success: false, error: 'La pieza no existe' };
        }

        // Use transaction to ensure atomic deletion and reordering
        await db.$transaction(async (tx) => {
            // 1. Delete the piece
            await tx.jewelryPiece.delete({
                where: { id }
            });

            // 2. Reorder subsequent pieces if the deleted piece had a numeric code
            if (pieceToDelete.code && !isNaN(Number(pieceToDelete.code))) {
                const deletedNum = Number(pieceToDelete.code);

                // Find all pieces with a numeric code higher than the deleted one
                const piecesToShift = await tx.jewelryPiece.findMany({
                    where: {
                        code: {
                            gt: pieceToDelete.code
                        }
                    },
                    orderBy: {
                        code: 'asc'
                    }
                });

                // Shift codes down by 1
                for (const piece of piecesToShift) {
                    if (piece.code && !isNaN(Number(piece.code))) {
                        const currentNum = Number(piece.code);
                        await tx.jewelryPiece.update({
                            where: { id: piece.id },
                            data: {
                                code: (currentNum - 1).toString()
                            }
                        });
                    }
                }
            }
        });

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/jewelry/sales");

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting jewelry piece:", error);
        return { success: false, error: error.message || "Error al eliminar la pieza" };
    }
}

/**
 * Transfers a piece between location A and B.
 * Requires user session.
 */
export async function transferJewelryPiece(id: string, newLocation: "A" | "B") {
    const session = await verifySession();
    if (!session) {
        return { success: false, error: 'No autorizado' };
    }

    try {
        const piece = await db.jewelryPiece.findUnique({ where: { id } });
        if (!piece) return { success: false, error: 'Pieza no encontrada' };
        if (piece.location === newLocation) return { success: false, error: 'La pieza ya está en esta ubicación' };

        await db.jewelryPiece.update({
            where: { id },
            data: { location: newLocation }
        });

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");
        revalidatePath("/jewelry/sales");

        return { success: true };
    } catch (error: any) {
        console.error("Error transferring jewelry piece:", error);
        return { success: false, error: error.message || "Error al transferir la pieza" };
    }
}

/**
 * Exports jewelry pieces of a specific location to CSV string.
 * Includes ALL pieces (AVAILABLE + SOLD) so that the home app can detect sold ones.
 */
export async function exportJewelryCsv(location: "A" | "B") {
    const session = await verifySession();
    if (!session) return { success: false, error: "No autorizado" };

    try {
        const pieces = await db.jewelryPiece.findMany({
            where: { location },
            orderBy: { code: "asc" }
        });

        // Include Status column so the home app can detect SOLD pieces
        const headers = ["ID", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "Location", "Status"];
        const rows = pieces.map(p => [
            p.id,
            p.code || "",
            `"${p.name.replace(/"/g, '""')}"`, // escape quotes
            p.weight.toString(),
            p.karat.toString(),
            p.laborCost.toString(),
            p.marginPercent.toString(),
            p.calculatedPrice.toString(),
            (p.profitAmount || 0).toString(),
            p.location,
            p.status
        ].join(","));

        const csvContent = [headers.join(","), ...rows].join("\n");
        return { success: true, data: csvContent };
    } catch (error: any) {
        console.error("Error exporting CSV:", error);
        return { success: false, error: "Error al generar CSV" };
    }
}

/**
 * Imports jewelry pieces from a CSV string into a specific location.
 */
export async function importJewelryCsv(csvText: string, targetLocation: "A" | "B") {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    try {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) return { success: false, error: "CSV vacío o sin suficientes datos" };

        const headers = lines[0].split(",");
        const piecesToCreate: any[] = [];

        // Simple parser
        for (let i = 1; i < lines.length; i++) {
            // regex to correctly split by comma ignoring commas inside quotes
            const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!row) continue;
            
            const cleanRow = row.map(col => col.replace(/^"|"$/g, '').replace(/""/g, '"'));
            
            const [id, code, name, weightStr, karatStr, laborStr, marginStr, calcPriceStr, profitStr] = cleanRow;

            // Optional: you could skip if the ID already exists to avoid duplicates
            // But let's just create new records for Tienda B. It's a "transfer literal".
            // Since ID is auto-generated by Prisma UUID, we usually ignore the ID from CSV
            
            piecesToCreate.push({
                name: name || "Joya Importada",
                weight: parseFloat(weightStr) || 0,
                karat: parseInt(karatStr, 10) || 18,
                laborCost: parseFloat(laborStr) || 0,
                marginPercent: parseFloat(marginStr) || 25,
                calculatedPrice: parseFloat(calcPriceStr) || 0,
                profitAmount: parseFloat(profitStr) || 0,
                marketPriceUsed: 0,
                status: "AVAILABLE",
                location: targetLocation,
            });
        }

        if (piecesToCreate.length === 0) {
            return { success: false, error: "No se encontraron joyas válidas en el CSV" };
        }

        // We use the JewelryProductionService.directEntry for each? Or bulk create?
        // Bulk create is much easier because directEntry expects quantity and generates codes sequentially
        
        // Wait, if we use directEntry, it generates codes. 
        // We probably WANT to generate new codes for the new store, or keep the old ones?
        // Let's just create them directly via Prisma to maintain exactly what's in the CSV if we want, OR generate new codes.
        // Actually, the new location will have its own code sequence. Calling `tx.jewelryPiece.create` one by one with `generateNextCode` is safest.
        
        const { JewelryProductionService } = await import("../services/jewelry-production-service");
        
        let importedCount = 0;
        await db.$transaction(async (tx) => {
            for (const pieceData of piecesToCreate) {
                await JewelryProductionService.directEntry(tx, {
                    userId: session.userId || "",
                    name: pieceData.name,
                    karat: pieceData.karat,
                    weight: pieceData.weight,
                    laborCost: pieceData.laborCost,
                    marginPercent: pieceData.marginPercent,
                    calculatedPrice: pieceData.calculatedPrice,
                    profitAmount: pieceData.profitAmount,
                    location: pieceData.location,
                    // photoUrl and materialId are skipped in basic CSV for simplicity
                });
                importedCount++;
            }
        });

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/production");

        return { success: true, count: importedCount };
    } catch (error: any) {
        console.error("Error importing CSV:", error);
        return { success: false, error: error.message || "Error al procesar el archivo CSV" };
    }
}
