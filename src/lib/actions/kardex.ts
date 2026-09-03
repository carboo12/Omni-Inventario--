'use server'

import db from '../db';

export async function getInventoryMovements(limit?: number) {
    try {
        const take = Math.min(limit || 500, 2000);

        const movements = await db.inventoryMovement.findMany({
            orderBy: { timestamp: 'desc' },
            include: { user: true },
            take,
        });

        const mappedMovements = movements.map(m => ({
            id: m.id,
            timestamp: m.timestamp,
            productName: m.productName,
            movementType: m.movementType as any,
            movementId: m.movementId,
            quantityChange: m.quantityChange,
            previousQuantity: m.previousQuantity,
            newQuantity: m.newQuantity,
            user: m.user.name,
            inventoryType: m.inventoryType as any
        }));

        return { success: true, data: mappedMovements };
    } catch (error) {
        console.error('Error fetching inventory movements:', error);
        return { success: false, error: 'Failed to fetch inventory movements' };
    }
}

export interface KardexReportRow {
    productName: string;
    barcode: string | null;
    category: string;
    inventoryType: string;
    initialStock: number;
    entries: number;
    exits: number;
    finalStock: number;
    costPriceNIO: number;
    priceNIO: number;
    inventoryValue: number;
}

export async function getKardexReport(startIso: string, endIso: string, inventoryType?: string) {
    try {
        const movements = await db.inventoryMovement.findMany({
            where: {
                timestamp: { gte: startIso, lte: endIso },
                ...(inventoryType && inventoryType !== 'all' ? { inventoryType } : {}),
            },
            orderBy: [{ productName: 'asc' }, { timestamp: 'asc' }],
        });

        if (!movements.length) return { success: true, data: [] as KardexReportRow[] };

        const names = [...new Set(movements.map((m) => m.productName))] as string[];
        const products = await db.product.findMany({
            where: { name: { in: names } },
            select: { name: true, barcode: true, category: true, costPriceNIO: true, priceNIO: true },
        });
        const productMap = new Map(products.map((p) => [p.name, p]));

        // Agrupar por tipo de inventario + producto para no mezclar farmacia/general.
        const grouped = new Map<string, {
            productName: string;
            inventoryType: string;
            initialStock: number;
            finalStock: number;
            entries: number;
            exits: number;
        }>();

        for (const m of movements) {
            const key = `${m.inventoryType}::${m.productName}`;
            let g = grouped.get(key);
            if (!g) {
                g = {
                    productName: m.productName,
                    inventoryType: m.inventoryType,
                    initialStock: m.previousQuantity,
                    finalStock: m.newQuantity,
                    entries: 0,
                    exits: 0,
                };
                grouped.set(key, g);
            }
            // Como los movimientos vienen ordenados asc dentro del producto,
            // el primero define el stock inicial y el último el stock final.
            g.finalStock = m.newQuantity;
            if (m.quantityChange > 0) g.entries += m.quantityChange;
            else g.exits += Math.abs(m.quantityChange);
        }

        const rows: KardexReportRow[] = Array.from(grouped.values()).map((g) => {
            const p = productMap.get(g.productName);
            const cost = p?.costPriceNIO ?? 0;
            return {
                productName: g.productName,
                barcode: p?.barcode ?? null,
                category: p?.category ?? 'General',
                inventoryType: g.inventoryType,
                initialStock: g.initialStock,
                entries: g.entries,
                exits: g.exits,
                finalStock: g.finalStock,
                costPriceNIO: cost,
                priceNIO: p?.priceNIO ?? 0,
                inventoryValue: cost * g.finalStock,
            };
        });

        return { success: true, data: rows };
    } catch (error) {
        console.error('Error fetching kardex report:', error);
        return { success: false, error: 'Failed to fetch kardex report' };
    }
}
