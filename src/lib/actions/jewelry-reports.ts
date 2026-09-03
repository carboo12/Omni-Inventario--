'use server'

import db from '../db';

/**
 * Fetches inventory statistics for jewelry.
 * Expected by JewelryReports component:
 * interface InventoryStat { name: string; count: number; valueUSD: number; weight: number; }
 */
export async function getJewelryInventoryStats() {
    try {
        const pieces = await db.jewelryPiece.findMany({
            where: { status: "AVAILABLE" },
            include: { jewelryMaterial: true }
        });

        const materialMap = new Map<string, { count: number; valueUSD: number; weight: number }>();

        // Get exchange rate to convert C$ to USD if needed, or assume data is stored in USD?
        // Looking at page.tsx, it passes exchangeRate.
        // JewelryReports does: s.valueUSD * exchangeRate.
        // So we should return valueUSD. 
        // In this system, jewelry prices are often calculated from gold price (USD) + labor.
        // Let's get the system exchange rate.
        const settings = await db.systemSettings.findFirst();
        const rate = parseFloat(settings?.exchangeRate || "36.5");

        pieces.forEach(p => {
            const mName = (p as any).jewelryMaterial?.name || "Otros";
            const current = materialMap.get(mName) || { count: 0, valueUSD: 0, weight: 0 };
            materialMap.set(mName, {
                count: current.count + 1,
                valueUSD: current.valueUSD + (p.calculatedPrice / rate),
                weight: current.weight + p.weight
            });
        });

        const stats = Array.from(materialMap.entries()).map(([name, data]) => ({
            name,
            ...data
        }));

        return { success: true, data: stats };
    } catch (error) {
        console.error("Error in getJewelryInventoryStats:", error);
        return { success: false, error: "Error al obtener estadísticas de inventario" };
    }
}

/**
 * Fetches sales statistics for jewelry within a date range.
 * Expected by JewelryReports:
 * chartData: { date: string; amount: number }[]
 * materialData: { name: string; revenue: number }[]
 * totalRevenue: number (USD)
 * totalCount: number
 */
export async function getJewelrySalesStats(startDate?: Date, endDate?: Date) {
    try {
        const where: any = { status: "SOLD" };
        if (startDate && endDate) {
            where.createdAt = { gte: startDate, lte: endDate };
        }

        const sales = await db.jewelryPiece.findMany({
            where,
            include: { jewelryMaterial: true }
        });

        const settings = await db.systemSettings.findFirst();
        const rate = parseFloat(settings?.exchangeRate || "36.5");

        // Chart data (sales per day in C$)
        const chartMap = new Map<string, number>();
        sales.forEach(s => {
            const day = s.createdAt.toISOString().split('T')[0];
            chartMap.set(day, (chartMap.get(day) || 0) + s.calculatedPrice);
        });
        const chartData = Array.from(chartMap.entries()).map(([date, amount]) => ({ date, amount }));

        // Material data (revenue per material in C$)
        const materialMap = new Map<string, number>();
        sales.forEach(s => {
            const mName = (s as any).jewelryMaterial?.name || "Desconocido";
            materialMap.set(mName, (materialMap.get(mName) || 0) + s.calculatedPrice);
        });
        const materialData = Array.from(materialMap.entries()).map(([name, revenue]) => ({ name, revenue }));

        const totalRevenueC$ = sales.reduce((sum, s) => sum + s.calculatedPrice, 0);

        return {
            success: true,
            chartData,
            materialData,
            totalRevenue: totalRevenueC$ / rate, // USD expected by component
            totalCount: sales.length
        };
    } catch (error) {
        console.error("Error in getJewelrySalesStats:", error);
        return { success: false, error: "Error al obtener estadísticas de ventas" };
    }
}

/**
 * Fetches a detailed list of jewelry inventory grouped by material.
 * Expected by JewelryReports:
 * detailedInventory: { materialName: string; pieces: any[]; }[]
 */
export async function getJewelryDetailedInventory() {
    try {
        const pieces = await db.jewelryPiece.findMany({
            where: { status: "AVAILABLE" },
            include: { jewelryMaterial: true },
            orderBy: { createdAt: 'desc' }
        });

        const materialMap = new Map<string, any[]>();
        pieces.forEach(p => {
            const mName = (p as any).jewelryMaterial?.name || "Otros / Sin Categoría";
            if (!materialMap.has(mName)) materialMap.set(mName, []);
            materialMap.get(mName)!.push(p);
        });

        const detailed = Array.from(materialMap.entries()).map(([materialName, pieces]) => ({
            materialName,
            pieces
        }));

        return { success: true, data: detailed };
    } catch (error) {
        console.error("Error in getJewelryDetailedInventory:", error);
        return { success: false, error: "Error al obtener inventario detallado" };
    }
}

/**
 * Fetches top selling jewelry pieces.
 * Expected by JewelryReports:
 * topSelling: { count: number; revenue: number; name: string; code: string; }[]
 */
export async function getJewelryTopSellingPieces(startDate?: Date, endDate?: Date) {
    try {
        const where: any = { status: "SOLD" };
        if (startDate && endDate) {
            where.createdAt = { gte: startDate, lte: endDate };
        }

        const pieces = await db.jewelryPiece.findMany({
            where,
            orderBy: { calculatedPrice: 'desc' },
            take: 10
        });

        const settings = await db.systemSettings.findFirst();
        const rate = parseFloat(settings?.exchangeRate || "36.5");

        // Since pieces are unique, count is always 1 per sold piece for now
        // If we had many identical SKUs, we'd group them.
        const topSelling = pieces.map(p => ({
            count: 1,
            revenue: p.calculatedPrice / rate, // USD
            name: p.name,
            code: p.code || p.id.slice(-6)
        }));

        return { success: true, data: topSelling };
    } catch (error) {
        console.error("Error in getJewelryTopSellingPieces:", error);
        return { success: false, error: "Error al obtener piezas más vendidas" };
    }
}

/**
 * ACTIONS FOR DAILY CLOSING
 */

export async function getTodayJewelrySalesDetail(sessionId: string) {
    try {
        const invoices = await db.salesInvoice.findMany({
            where: { sessionId: sessionId },
            include: {
                salesInvoiceItem: true,
                user: true
            },
            orderBy: { date: "desc" }
        });

        const salesDetails = [];

        // Collect all piece IDs from all invoices to fetch them in one go
        const pieceIds = invoices.flatMap(inv => (inv as any).salesInvoiceItem.map((item: any) => item.productId));
        
        // Fetch all pieces in one query
        const pieces = await db.jewelryPiece.findMany({
            where: {
                id: { in: pieceIds }
            }
        });

        const piecesMap = new Map(pieces.map(p => [p.id, p]));

        for (const invoice of invoices) {
            for (const item of (invoice as any).salesInvoiceItem) {
                const piece = piecesMap.get(item.productId);

                if (piece) {
                    salesDetails.push({
                        id: `${invoice.id}-${piece.id}`,
                        pieceId: piece.id,
                        pieceName: piece.name,
                        pieceCode: piece.code || piece.id.slice(-6).toUpperCase(),
                        amount: item.totalPrice,
                        description: `Venta Factura #${invoice.invoiceNumber}`,
                        createdAt: invoice.date,
                        karat: piece.karat,
                        weight: piece.weight,
                        invoiceNumber: invoice.invoiceNumber
                    });
                }
            }
        }

        return { success: true, data: salesDetails };
    } catch (error) {
        console.error("Error fetching jewelry sales detail:", error);
        return { success: false, error: "Error al obtener el detalle de ventas" };
    }
}

export async function getJewelrySessionSummary(sessionId: string) {
    try {
        const session = await db.cashRegisterSession.findUnique({
            where: { id: sessionId },
            include: {
                user: true
            }
        });

        if (!session) return { success: false, error: "Sesión no encontrada" };

        return {
            success: true,
            data: {
                initialAmount: session.initialAmount,
                totalSales: session.totalSales || 0,
                salesCash: session.salesCash || 0,
                salesCard: session.salesCard || 0,
                salesUSD: session.salesUSD || 0,
                cashierName: session.cashierName,
                openingTime: session.openingTime,
                status: session.status
            }
        };
    } catch (error) {
        return { success: false, error: "Error al obtener el resumen de la sesión" };
    }
}
