"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

// ----------------------------------------------------------------------
// HELPER FUNCIONES CSV
// ----------------------------------------------------------------------
function escapeCsvValue(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                current += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// ----------------------------------------------------------------------
// EXPORT INVENTORY
// ----------------------------------------------------------------------
export async function exportJewelryInventoryCSV(location?: string) {
    try {
        const where: any = {};
        if (location && location !== "ALL") {
            where.location = location;
        }

        const pieces = await db.jewelryPiece.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        const headers = ["Id", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "MarketPriceUsed", "Status", "PhotoUrl"];
        const rows = pieces.map((p: any) => [
            p.id,
            p.code || "",
            p.name,
            p.weight,
            p.karat,
            p.laborCost,
            p.marginPercent,
            p.calculatedPrice,
            p.profitAmount,
            p.marketPriceUsed,
            p.status,
            p.photoUrl || ""
        ]);

        const csvString = [
            headers.join(","),
            ...rows.map((r: any) => r.map(escapeCsvValue).join(","))
        ].join("\n");

        return { success: true, data: csvString };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ----------------------------------------------------------------------
// IMPORT INVENTORY
// ----------------------------------------------------------------------
export async function importJewelryInventoryCSV(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No se proporcionó ningún archivo");

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");

        const headers = parseCsvLine(lines[0]).map(h => h.trim());
        const expectedHeaders = ["Id", "Code", "Name", "Weight", "Karat", "LaborCost", "MarginPercent", "CalculatedPrice", "ProfitAmount", "MarketPriceUsed", "Status", "PhotoUrl"];
        
        // Very basic validation
        if (headers[0] !== "Id" || headers[2] !== "Name") {
            throw new Error("Formato de CSV no reconocido. Se esperaba Id, Code, Name...");
        }

        let updated = 0;
        let created = 0;
        
        // Usar una transacción masiva o iteraciones
        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            // Parse fields safely
            const data = {
                id: values[0] || undefined, // If empty, prisma won't let upsert without ID, so we handle it below
                code: values[1] || null,
                name: values[2],
                weight: parseFloat(values[3] || "0"),
                karat: parseInt(values[4] || "0"),
                laborCost: parseFloat(values[5] || "0"),
                marginPercent: parseFloat(values[6] || "0"),
                calculatedPrice: parseFloat(values[7] || "0"),
                profitAmount: parseFloat(values[8] || "0"),
                marketPriceUsed: parseFloat(values[9] || "0"),
                status: (values[10] || "AVAILABLE") as any,
                photoUrl: values[11] || null
            };

            if (!data.name || isNaN(data.weight)) continue; // skip invalid rows

            if (data.id) {
                // Existe ID, hacer Upsert
                const existing = await db.jewelryPiece.findUnique({ where: { id: data.id } });
                if (existing) {
                    await db.jewelryPiece.update({ where: { id: data.id }, data });
                    updated++;
                } else {
                    await db.jewelryPiece.create({ data: { ...data, id: data.id } });
                    created++;
                }
            } else {
                // Sin ID, crear como nuevo
                await db.jewelryPiece.create({ data });
                created++;
            }
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/sync");
        
        return { success: true, message: `Importación completada: ${created} creados, ${updated} actualizados.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ----------------------------------------------------------------------
// EXPORT SALES
// ----------------------------------------------------------------------
export async function exportJewelrySalesCSV(location?: string) {
    try {
        const where: any = { status: "SOLD" };
        if (location && location !== "ALL") {
            where.location = location;
        }

        const soldPieces = await db.jewelryPiece.findMany({
            where
        });

        const headers = ["PieceId", "DateExported", "Code", "Name", "SalePrice"];
        const rows = soldPieces.map((p: any) => [
            p.id,
            new Date().toISOString(),
            p.code || "",
            p.name,
            p.calculatedPrice // Precio aprox de venta si no queremos rastrear la factura exacta en este CSV simple
        ]);

        const csvString = [
            headers.join(","),
            ...rows.map((r: any) => r.map(escapeCsvValue).join(","))
        ].join("\n");

        return { success: true, data: csvString };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ----------------------------------------------------------------------
// IMPORT SALES
// ----------------------------------------------------------------------
export async function importJewelrySalesCSV(formData: FormData, userId: string) {
    try {
        const file = formData.get("file") as File;
        if (!file) throw new Error("No se proporcionó ningún archivo");

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");

        let soldCount = 0;
        
        // Al importar ventas, simulamos que esas piezas se vendieron en el local y las descontamos (status SOLD)
        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            const pieceId = values[0];
            const pieceName = values[3];
            
            if (!pieceId) continue;

            const existing = await db.jewelryPiece.findUnique({ where: { id: pieceId } });
            if (existing && existing.status !== "SOLD") {
                await db.jewelryPiece.update({
                    where: { id: pieceId },
                    data: { status: "SOLD" }
                });

                // Registrar auditoría o log
                await db.auditLog.create({
                    data: {
                        userId: userId,
                        action: "JEWELRY_SALE_SYNC",
                        entity: "JewelryPiece",
                        entityId: pieceId
                    }
                });

                soldCount++;
            }
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/sync");
        
        // Notify admin
        if (soldCount > 0) {
            await createNotification(
                'success',
                `Sincronización de ventas completada: ${soldCount} piezas marcadas como vendidas en el sistema central.`
            );
        }

        return { success: true, message: `Sincronización completada: ${soldCount} piezas marcadas como vendidas en casa.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ----------------------------------------------------------------------
// ANALYZE STORE CSV (Preview before applying)
// Compares the store's exported CSV against local inventory by jewelry CODE.
// Returns a list of pieces that have been sold at the store (status SOLD in CSV)
// but are still AVAILABLE locally — so the user can preview before committing.
// ----------------------------------------------------------------------
export async function analyzeStoreCsv(csvText: string) {
    try {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) throw new Error("El archivo CSV no tiene datos suficientes.");

        // Determine format: check headers
        const headers = parseCsvLine(lines[0]).map(h => h.trim());
        // Supported: "ID,Code,Name,Weight,Karat,...,Status,..." (from exportJewelryInventoryCSV)
        // or "PieceId,DateExported,Code,Name,SalePrice" (from exportJewelrySalesCSV)
        const isSalesFormat = headers[0] === "PieceId" || headers[0] === "PieceId";
        const isInventoryFormat = headers.includes("Status") || headers.includes("Code");

        // Build map of code -> status from CSV
        const csvSoldCodes: Set<string> = new Set();
        const csvSoldIds: Set<string> = new Set();

        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            if (isSalesFormat && headers[0] === "PieceId") {
                // Sales export format: PieceId,DateExported,Code,Name,SalePrice
                const pieceId = values[0]?.trim();
                const code = values[2]?.trim();
                if (pieceId) csvSoldIds.add(pieceId);
                if (code) csvSoldCodes.add(code);
            } else {
                // Inventory export format: Id,Code,Name,...,Status,...
                const codeIdx = headers.indexOf("Code");
                const statusIdx = headers.indexOf("Status");
                const idIdx = headers.indexOf("Id") !== -1 ? headers.indexOf("Id") : headers.indexOf("ID");
                const status = statusIdx !== -1 ? values[statusIdx]?.trim() : "";
                const code = codeIdx !== -1 ? values[codeIdx]?.trim() : "";
                const id = idIdx !== -1 ? values[idIdx]?.trim() : "";
                if (status === "SOLD") {
                    if (code) csvSoldCodes.add(code);
                    if (id) csvSoldIds.add(id);
                }
            }
        }

        if (csvSoldCodes.size === 0 && csvSoldIds.size === 0) {
            return {
                success: true,
                soldAtStore: [],
                message: "No se encontraron joyas vendidas en el CSV de la tienda."
            };
        }

        // Find local pieces that match the sold codes/IDs and are still AVAILABLE
        const localPieces = await db.jewelryPiece.findMany({
            where: {
                status: "AVAILABLE"
            }
        });

        const soldAtStore = localPieces.filter(p => {
            const matchByCode = p.code && csvSoldCodes.has(p.code);
            const matchById = csvSoldIds.has(p.id);
            return matchByCode || matchById;
        });

        return {
            success: true,
            soldAtStore: soldAtStore.map(p => ({
                id: p.id,
                code: p.code,
                name: p.name,
                karat: p.karat,
                weight: p.weight,
                calculatedPrice: p.calculatedPrice,
                location: p.location,
            })),
            message: `Se encontraron ${soldAtStore.length} piezas vendidas en la tienda que aún aparecen disponibles en casa.`
        };
    } catch (error: any) {
        return { success: false, error: error.message, soldAtStore: [] };
    }
}

// ----------------------------------------------------------------------
// APPLY STORE SYNC TO LOCAL INVENTORY
// Given a list of piece IDs, marks them as SOLD in the local inventory (Inventory A).
// This is the action triggered by the "Actualizar inventario local" button.
// ----------------------------------------------------------------------
export async function applyStoreSyncToLocalInventory(pieceIds: string[], userId: string) {
    try {
        if (!pieceIds || pieceIds.length === 0) {
            return { success: false, error: "No hay piezas para sincronizar." };
        }

        let updatedCount = 0;

        for (const pieceId of pieceIds) {
            const piece = await db.jewelryPiece.findUnique({ where: { id: pieceId } });
            if (piece && piece.status !== "SOLD") {
                await db.jewelryPiece.update({
                    where: { id: pieceId },
                    data: { status: "SOLD" }
                });

                // Audit log
                await db.auditLog.create({
                    data: {
                        userId: userId,
                        action: "STORE_SYNC_SOLD",
                        entity: "JewelryPiece",
                        entityId: pieceId
                    }
                });

                updatedCount++;
            }
        }

        revalidatePath("/jewelry/inventory");
        revalidatePath("/jewelry/sync");

        return {
            success: true,
            updatedCount,
            message: `✅ Inventario actualizado: ${updatedCount} piezas marcadas como vendidas en el local.`
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
