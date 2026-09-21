'use server'

import db from '../db';

export async function getSalesData(startDate?: Date, endDate?: Date) {
    const currentYear = new Date().getFullYear();

    const whereClause: any = {
        movementType: 'Venta',
    };

    if (startDate && endDate) {
        whereClause.timestamp = {
            gte: startDate.toISOString(),
            lte: endDate.toISOString()
        };
    } else {
        // Default to current year if no range provided
        whereClause.timestamp = {
            startsWith: `${currentYear}`
        };
    }

    // Fetch all sales movements
    const sales = await db.inventoryMovement.findMany({
        where: whereClause
    });

    // Initialize monthly data
    const monthlyData = Array(12).fill(0);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Let's try to get products to map prices
    const products = await db.product.findMany();
    const productPriceMap = new Map(products.map(p => [p.name, p.priceNIO]));

    sales.forEach(sale => {
        const date = new Date(sale.timestamp);
        const month = date.getMonth();
        const quantity = Math.abs(sale.quantityChange);
        const price = productPriceMap.get(sale.productName) || 0;
        monthlyData[month] += quantity * price;
    });

    return monthNames.map((month, index) => ({
        month,
        sales: monthlyData[index] || 0
    }));
}

export async function getTopProducts(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
        movementType: 'Venta',
    };

    if (startDate && endDate) {
        whereClause.timestamp = {
            gte: startDate.toISOString(),
            lte: endDate.toISOString()
        };
    }

    const sales = await db.inventoryMovement.findMany({
        where: whereClause
    });

    const products = await db.product.findMany();
    const productPriceMap = new Map(products.map(p => [p.name, p.priceNIO]));

    const productStats = new Map<string, { unitsSold: number, revenue: number }>();

    sales.forEach(sale => {
        const quantity = Math.abs(sale.quantityChange);
        const price = productPriceMap.get(sale.productName) || 0;

        if (!productStats.has(sale.productName)) {
            productStats.set(sale.productName, { unitsSold: 0, revenue: 0 });
        }

        const stats = productStats.get(sale.productName)!;
        stats.unitsSold += quantity || 0;
        stats.revenue += (quantity || 0) * (price || 0);
    });

    // Convert map to array and sort
    return Array.from(productStats.entries())
        .map(([name, stats]) => ({
            name,
            unitsSold: stats.unitsSold || 0,
            revenue: stats.revenue || 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5
}

export async function getLowStockInventory() {
    // Se evalúa sobre el STOCK TOTAL CONSOLIDADO del producto: se suma el stock de
    // todos sus lotes (productId) y la alerta solo dispara si la suma cae por debajo
    // del umbral mínimo, evitando falsos positivos por lotes individuales en 0.
    const inventory = await db.inventoryItem.findMany({
        include: {
            product: true
        }
    });

    // Consolidar stock total por producto
    const totals = new Map<string, { total: number; minStock: number }>();
    for (const item of inventory) {
        const key = item.productId || `${item.inventoryType}::${item.productName}`;
        const current = totals.get(key) || { total: 0, minStock: item.product.minStock || 10 };
        current.total += item.quantity;
        current.minStock = item.product.minStock || current.minStock || 10;
        totals.set(key, current);
    }

    // Un producto cuenta como stock bajo solo si SU TOTAL consolidado está bajo el umbral.
    const lowStockProductIds = new Set<string>();
    for (const [key, agg] of totals.entries()) {
        if (agg.total <= 0 || agg.total < agg.minStock) {
            lowStockProductIds.add(key);
        }
    }

    // Devolver una sola fila por producto bajo (consolidada), sin duplicar por lote.
    const resultMap = new Map<string, { id: string; productName: string; quantity: number; minStock: number; status: string }>();
    for (const item of inventory) {
        const key = item.productId || `${item.inventoryType}::${item.productName}`;
        if (!lowStockProductIds.has(key)) continue;
        if (resultMap.has(key)) continue;
        const agg = totals.get(key)!;
        resultMap.set(key, {
            id: item.id,
            productName: item.productName,
            quantity: agg.total,
            minStock: agg.minStock,
            status: agg.total <= 0 ? 'Agotado' : 'Stock Bajo'
        });
    }
    return Array.from(resultMap.values());
}

export async function getExpiringProducts(daysThreshold: number = 30) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    // We need to compare string ISO dates. 
    // We'll rely on ISO string comparison which works for YYYY-MM-DD format.

    const inventory = await db.inventoryItem.findMany({
        where: {
            expiryDate: {
                lte: futureDate.toISOString(),
                gte: today.toISOString()
            },
            quantity: {
                gt: 0 // Only show items we actually have
            }
        }
    });

    return inventory.map(item => ({
        id: item.id,
        productName: item.productName,
        batch: item.batch,
        expiryDate: item.expiryDate,
        quantity: item.quantity
    }));
}

export async function getCashClosingReport(startDate?: Date, endDate?: Date, cashierId?: string) {
    const whereClause: any = {
        status: 'closed' // Only interested in closed sessions for the report
    };

    if (startDate && endDate) {
        // Adjust dates to cover the full day range if needed, or rely on caller to provide precise times.
        // Usually reports are by day, so let's assume startDate is 00:00 and endDate is 23:59 or we handle it here.
        // Since database uses ISO strings, let's just use the passed dates directly for now.
        whereClause.openingTime = {
            gte: startDate.toISOString()
        };
        // For closing time logic, we might want to check openingTime or closingTime. usually reports filter by when it happened.
        // Let's filter by openingTime in the range. 
        whereClause.openingTime = {
            gte: startDate.toISOString(),
            lte: endDate.toISOString()
        };
    }

    if (cashierId && cashierId !== 'all') {
        whereClause.cashierId = cashierId;
    }

    const sessions = await db.cashRegisterSession.findMany({
        where: whereClause,
        include: {
            user: true
        },
        orderBy: {
            openingTime: 'desc'
        }
    });

    return sessions.map(session => ({
        id: session.id,
        cashierName: session.cashierName,
        openingTime: session.openingTime,
        closingTime: session.closingTime,
        initialAmount: session.initialAmount || 0,
        finalAmount: session.finalAmount || 0, // This is expected cash
        actualCash: session.actualCash || 0, // This is reported cash
        salesTotal: session.totalSales || 0,
        difference: session.difference || 0, // discrepancy
        // Aliases para reportes/informes: Monto de Apertura y Total Esperado.
        openingBalance: session.initialAmount || 0,
        expectedCash: session.finalAmount || 0,
        status: session.status
    }));
}

export async function getCreditPerformanceData(startDate?: Date, endDate?: Date) {
    const whereClause: any = { paymentMethod: 'Credito' };
    if (startDate && endDate) {
        whereClause.date = { gte: startDate.toISOString(), lte: endDate.toISOString() };
    }

    const creditSales = await db.salesInvoice.findMany({
        where: whereClause,
        include: { salesInvoiceItem: true }
    });

    // 1. Best Sellers al Crédito
    const productStats = new Map<string, { units: number, revenue: number }>();
    creditSales.forEach(sale => {
        (sale as any).salesInvoiceItem.forEach((item: any) => {
            const stats = productStats.get(item.productName) || { units: 0, revenue: 0 };
            stats.units += item.quantity;
            stats.revenue += item.totalPrice;
            productStats.set(item.productName, stats);
        });
    });

    const topCreditProducts = Array.from(productStats.entries())
        .map(([name, stats]) => ({ name, units: stats.units, revenue: stats.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // 2. Clientes más Prometedores (Ranking por cumplimiento y rapidez)
    const customers = await db.customer.findMany({
        where: { hasCredit: true },
        include: { 
            salesInvoice: { where: { paymentMethod: 'Credito' } },
            creditPayment: true 
        }
    });

    const customerRanking = customers.map(c => {
        const totalBorrowed = (c as any).salesInvoice.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
        const totalPaid = (c as any).creditPayment.reduce((sum: number, p: any) => sum + p.amount, 0);
        const complianceRate = totalBorrowed > 0 ? (totalPaid / totalBorrowed) * 100 : 100;
        
        // Puntaje = Frecuencia * Cumplimiento
        const score = ((c as any).salesInvoice.length * (complianceRate / 100));
 
        return {
            id: c.id,
            name: c.fullName,
            score: score || 0,
            totalBorrowed: totalBorrowed || 0,
            totalPaid: totalPaid || 0,
            complianceRate: complianceRate || 0,
            lastPayment: (c as any).creditPayment[0]?.timestamp || null
        };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    // 3. Métricas Agregadas
    const totalBorrowed = customers.reduce((sum, c) => sum + (c as any).salesInvoice.reduce((s: number, sl: any) => s + sl.totalAmount, 0), 0);
    const totalRecovered = customers.reduce((sum, c) => sum + (c as any).creditPayment.reduce((p: number, py: any) => p + py.amount, 0), 0);
    const recoveryRate = totalBorrowed > 0 ? (totalRecovered / totalBorrowed) * 100 : 0;

    return {
        topCreditProducts: topCreditProducts.map(p => ({
            name: p.name,
            units: p.units || 0,
            revenue: p.revenue || 0
        })),
        customerRanking,
        summary: {
            totalBorrowed: totalBorrowed || 0,
            totalRecovered: totalRecovered || 0,
            recoveryRate: recoveryRate || 0,
            activeDebtors: customers.filter(c => c.currentBalance > 0).length || 0
        }
    };
}

export async function getPriceLevelAnalysis(startDate?: Date, endDate?: Date) {
    const whereClause: any = { status: 'COMPLETED' };
    if (startDate && endDate) {
        whereClause.date = { gte: startDate.toISOString(), lte: endDate.toISOString() };
    }

    const invoices = await db.salesInvoice.findMany({
        where: whereClause,
        include: { salesInvoiceItem: true, user: true }
    });

    const summary = new Map<number, { units: number; revenue: number }>();
    const byUser = new Map<string, {
        id: string;
        name: string;
        total: number;
        manualCount: number;
        levels: Record<number, { units: number; revenue: number }>;
    }>();

    invoices.forEach(inv => {
        const userId = (inv as any).userId;
        const userName = (inv as any).user?.name || (inv as any).user?.username || (inv as any).user?.email || 'Cajero';

        if (!byUser.has(userId)) {
            byUser.set(userId, {
                id: userId,
                name: userName,
                total: 0,
                manualCount: 0,
                levels: {}
            });
        }
        const user = byUser.get(userId)!;

        (inv as any).salesInvoiceItem.forEach((item: any) => {
            const level = typeof item.priceLevel === 'number' ? item.priceLevel : 1;
            const revenue = item.totalPrice || 0;
            const units = item.quantity || 0;

            const sum = summary.get(level) || { units: 0, revenue: 0 };
            sum.units += units;
            sum.revenue += revenue;
            summary.set(level, sum);

            if (!user.levels[level]) user.levels[level] = { units: 0, revenue: 0 };
            user.levels[level].units += units;
            user.levels[level].revenue += revenue;
            user.total += revenue;
            if (level === 0) user.manualCount += 1;
        });
    });

    const levelLabels: Record<number, string> = {
        0: 'Manual / Personalizado',
        1: 'Precio 1 (Detalle)',
        2: 'Precio 2',
        3: 'Precio 3',
        4: 'Precio 4',
    };

    const levels = Array.from(summary.entries()).map(([level, data]) => ({
        level,
        label: levelLabels[level] || `Nivel ${level}`,
        units: data.units,
        revenue: data.revenue
    })).sort((a, b) => a.level - b.level);

    const users = Array.from(byUser.values()).map(u => ({
        id: u.id,
        name: u.name,
        total: u.total,
        manualCount: u.manualCount,
        levels: Object.entries(u.levels).map(([level, data]) => ({
            level: parseInt(level, 10),
            label: levelLabels[parseInt(level, 10)] || `Nivel ${level}`,
            units: data.units,
            revenue: data.revenue
        })).sort((a, b) => a.level - b.level)
    })).sort((a, b) => b.total - a.total);

    const overallTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    return {
        levels,
        users,
        summary: {
            totalRevenue: overallTotal || 0,
            manualLevelCount: (summary.get(0)?.units) || 0
        }
    };
}

// ============================================================================
// MÓDULO DE REPORTES Y ANALÍTICA AVANZADA
// ============================================================================

type RangeInput = string | null | undefined;

function parseDate(v: RangeInput | Date | null): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? undefined : d;
}

// Si `to` solo trae fecha (sin hora), ampliamos al final del día para no perder el día completo.
function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

interface InvoiceRange {
    start?: Date;
    end?: Date;
}

function buildInvoiceRange(from?: Date, to?: Date): InvoiceRange {
    let start = from;
    let end = to;
    if (!start) {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (!end) end = new Date();
    if (end < start) end = start;
    return { start, end: endOfDay(end) };
}

async function getExchangeRateValue(): Promise<number> {
    const settings = await db.systemSettings.findFirst({ select: { exchangeRate: true } });
    const rate = parseFloat(settings?.exchangeRate || '36.5');
    return isNaN(rate) || rate <= 0 ? 36.5 : rate;
}

async function fetchInvoicesInRange(from?: Date, to?: Date, includeUser = true): Promise<any[]> {
    const where: any = { status: 'COMPLETED' };
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = from;
        if (to) where.date.lte = to;
    }
    return db.salesInvoice.findMany({
        where,
        select: {
            id: true,
            invoiceNumber: true,
            date: true,
            totalAmount: true,
            paymentMethod: true,
            userId: true,
            user: includeUser ? { select: { id: true, name: true, role: true, assignedLocation: true } } : undefined,
            salesInvoiceItem: {
                select: {
                    productId: true,
                    productName: true,
                    quantity: true,
                    unitPrice: true,
                    totalPrice: true,
                    presentationFactor: true,
                    baseUnit: true,
                    bulkUnit: true,
                    variantId: true,
                    isEncargo: true,
                    priceLevel: true,
                },
            },
        },
    }) as any;
}

async function getReportProductCatalog() {
    const [products, categories] = await Promise.all([
        db.product.findMany({
            select: {
                id: true,
                name: true,
                barcode: true,
                costPriceNIO: true,
                categoryId: true,
                category: true,
                inventoryType: true,
                hasVariants: true,
            },
        }),
        db.category.findMany({ select: { id: true, name: true, parentId: true, inventoryType: true } }),
    ]);

    const catById = new Map(categories.map((c) => [c.id, c]));
    const catByName = new Map(categories.map((c) => [c.name, c]));
    const productById = new Map<string, any>();

    for (const p of products) {
        let cat: any = p.categoryId ? catById.get(p.categoryId) : undefined;
        if (!cat && p.category) cat = catByName.get(p.category) || undefined;
        productById.set(p.id, {
            id: p.id,
            name: p.name,
            barcode: p.barcode || '',
            cost: p.costPriceNIO || 0,
            inventoryType: p.inventoryType,
            hasVariants: p.hasVariants,
            categoryId: cat?.id || null,
            categoryName: cat?.name || p.category || 'Sin categoría',
            parentId: cat?.parentId || null,
        });
    }

    return { productById, categories: categories as any[] };
}

function unitCountFor(item: any): number {
    const q = Number(item.quantity) || 0;
    if (q > 0) return Math.abs(q);
    const unitPrice = Number(item.unitPrice) || 0;
    const total = Number(item.totalPrice) || 0;
    if (unitPrice > 0 && total > 0) return Math.abs(total / unitPrice);
    return 0;
}

function safePercent(num: number, den: number): number {
    return den > 0 ? (num / den) * 100 : 0;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// RESUMEN GENERAL
// ---------------------------------------------------------------------------
export async function getReportSummary(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const rate = await getExchangeRateValue();
    const { productById } = await getReportProductCatalog();

    let totalRevenue = 0;
    let totalUnits = 0;
    let totalCost = 0;

    for (const inv of invoices) {
        totalRevenue += Number(inv.totalAmount) || 0;
        for (const item of inv.salesInvoiceItem || []) {
            const units = unitCountFor(item);
            totalUnits += units;
            totalCost += (productById.get(item.productId)?.cost || 0) * units;
        }
    }

    const totalProfit = totalRevenue - totalCost;
    const count = invoices.length;

    return {
        totalRevenue: round2(totalRevenue),
        totalUnits: round2(totalUnits),
        totalCost: round2(totalCost),
        totalProfit: round2(totalProfit),
        marginPct: safePercent(totalProfit, totalRevenue),
        invoiceCount: count,
        avgTicket: count > 0 ? round2(totalRevenue / count) : 0,
        revenueUSD: round2(totalRevenue / rate),
        profitUSD: round2(totalProfit / rate),
        exchangeRate: rate,
    };
}

// ---------------------------------------------------------------------------
// 1. VENTAS DETALLADAS POR CATEGORÍA
// ---------------------------------------------------------------------------
export async function getReportSalesByCategory(from?: string, to?: string, categoryId?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const { productById } = await getReportProductCatalog();

    interface CatAgg {
        categoryId: string;
        categoryName: string;
        parentId: string | null;
        inventoryType: string;
        units: number;
        revenue: number;
        cost: number;
        set: Set<string>;
    }

    const agg = new Map<string, CatAgg>();
    const ensure = (key: string, name: string, parentId: string | null, inventoryType: string) => {
        let row = agg.get(key);
        if (!row) {
            row = { categoryId: key, categoryName: name, parentId, inventoryType, units: 0, revenue: 0, cost: 0, set: new Set() };
            agg.set(key, row);
        }
        return row;
    };

    for (const inv of invoices) {
        for (const item of inv.salesInvoiceItem || []) {
            const p = productById.get(item.productId);
            const units = unitCountFor(item);
            const revenue = Number(item.totalPrice) || 0;
            const cost = (p?.cost || 0) * units;
            const key = p?.categoryId || (p?.categoryName ? `name:${p.categoryName}` : 'sin-categoria');
            const row = ensure(key, p?.categoryName || 'Sin categoría', p?.parentId || null, p?.inventoryType || '');
            row.units += units;
            row.revenue += revenue;
            row.cost += cost;
            row.set.add(inv.id);
        }
    }

    let rows = Array.from(agg.values())
        .map((r) => ({
            categoryId: r.categoryId,
            categoryName: r.categoryName,
            parentId: r.parentId,
            inventoryType: r.inventoryType,
            units: round2(r.units),
            revenue: round2(r.revenue),
            cost: round2(r.cost),
            profit: round2(r.revenue - r.cost),
            marginPct: safePercent(r.revenue - r.cost, r.revenue),
            invoiceCount: r.set.size,
        }))
        .sort((a, b) => b.revenue - a.revenue);

    if (categoryId && categoryId !== 'all') {
        rows = rows.filter((r) => r.categoryId === categoryId || r.parentId === categoryId);
    }

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    rows = rows.map((r) => ({ ...r, sharePct: safePercent(r.revenue, totalRevenue) }));

    return {
        rows,
        subcategories: rows.filter((r) => r.parentId),
        total: {
            units: round2(rows.reduce((s, r) => s + r.units, 0)),
            revenue: round2(totalRevenue),
            cost: round2(rows.reduce((s, r) => s + r.cost, 0)),
            profit: round2(rows.reduce((s, r) => s + r.profit, 0)),
            marginPct: safePercent(rows.reduce((s, r) => s + r.profit, 0), totalRevenue),
            invoiceCount: new Set(invoices.map((i) => i.id)).size,
        },
    };
}

// ---------------------------------------------------------------------------
// 2. VENTAS DETALLADAS POR PRODUCTO
// ---------------------------------------------------------------------------
export async function getReportSalesByProduct(from?: string, to?: string, categoryId?: string, location?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const rate = await getExchangeRateValue();
    const { productById, categories } = await getReportProductCatalog();
    const organized: any[] = categories.filter((c: any) => !c.parentId);

    interface ItemAgg {
        productId: string;
        productName: string;
        barcode: string;
        categoryId: string | null;
        categoryName: string;
        units: number;
        revenue: number;
        cost: number;
        invoices: number;
    }

    const agg = new Map<string, ItemAgg>();
    const locations = new Set<string>();

    const ensureItem = (productId: string | null, fallbackName: string) => {
        const key = productId || `name:${fallbackName}`;
        let row = agg.get(key);
        if (!row) {
            const p = productId ? productById.get(productId) : undefined;
            row = {
                productId: key,
                productName: p?.name || fallbackName,
                barcode: p?.barcode || '',
                categoryId: p?.categoryId || null,
                categoryName: p?.categoryName || 'Sin categoría',
                units: 0,
                revenue: 0,
                cost: 0,
                invoices: 0,
            };
            agg.set(key, row);
        }
        return row;
    };

    for (const inv of invoices) {
        const loc = (inv.user as any)?.assignedLocation || 'Sin ubicación';
        locations.add(loc);
        if (location && location !== 'all' && loc !== location) continue;
        for (const item of inv.salesInvoiceItem || []) {
            const row = ensureItem(item.productId, item.productName);
            const units = unitCountFor(item);
            row.units += units;
            row.revenue += Number(item.totalPrice) || 0;
            row.cost += (productById.get(item.productId)?.cost || 0) * units;
            row.invoices += 1;
        }
    }

    let rows = Array.from(agg.values()).map((r) => ({
        productId: r.productId,
        productName: r.productName,
        barcode: r.barcode,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        units: round2(r.units),
        revenue: round2(r.revenue),
        revenueUSD: round2(r.revenue / rate),
        cost: round2(r.cost),
        profit: round2(r.revenue - r.cost),
        profitUSD: round2((r.revenue - r.cost) / rate),
        marginPct: safePercent(r.revenue - r.cost, r.revenue),
        avgUnitPrice: r.units > 0 ? round2(r.revenue / r.units) : 0,
        invoices: r.invoices,
    })).sort((a, b) => b.revenue - a.revenue);

    if (categoryId && categoryId !== 'all') {
        rows = rows.filter((r) => r.categoryId === categoryId);
    }

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    return {
        rows,
        total: {
            units: round2(rows.reduce((s, r) => s + r.units, 0)),
            revenue: round2(totalRevenue),
            revenueUSD: round2(totalRevenue / rate),
            cost: round2(rows.reduce((s, r) => s + r.cost, 0)),
            profit: round2(rows.reduce((s, r) => s + r.profit, 0)),
            profitUSD: round2(rows.reduce((s, r) => s + r.profit, 0) / rate),
            marginPct: safePercent(rows.reduce((s, r) => s + r.profit, 0), totalRevenue),
            invoices: new Set(invoices.map((i) => i.id)).size,
        },
        locations: Array.from(locations).sort(),
        exchangeRate: rate,
        categories: {
            all: categories.map((c: any) => ({ id: c.id, name: c.name, parentId: c.parentId })),
            organized,
        },
    };
}

// ---------------------------------------------------------------------------
// 3. PRODUCTOS MÁS VENDIDOS (TOP SELLING) + PARETO 80/20
// ---------------------------------------------------------------------------
export async function getReportTopSelling(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const rate = await getExchangeRateValue();
    const { productById } = await getReportProductCatalog();

    interface ItemAgg {
        productId: string;
        productName: string;
        units: number;
        revenue: number;
        cost: number;
    }

    const agg = new Map<string, ItemAgg>();
    for (const inv of invoices) {
        for (const item of inv.salesInvoiceItem || []) {
            const key = item.productId || `name:${item.productName}`;
            let row = agg.get(key);
            if (!row) {
                const p = item.productId ? productById.get(item.productId) : undefined;
                row = { productId: key, productName: p?.name || item.productName, units: 0, revenue: 0, cost: 0 };
                agg.set(key, row);
            }
            const units = unitCountFor(item);
            row.units += units;
            row.revenue += Number(item.totalPrice) || 0;
            row.cost += (productById.get(item.productId)?.cost || 0) * units;
        }
    }

    const base = Array.from(agg.values());
    const totalRevenue = base.reduce((s, r) => s + r.revenue, 0);
    const totalUnits = base.reduce((s, r) => s + r.units, 0);

    const byRevenue = base
        .map((r) => ({ ...r, revenueSharePct: safePercent(r.revenue, totalRevenue) }))
        .sort((a, b) => b.revenue - a.revenue);

    let cum = 0;
    let paretoCount = 0;
    let paretoRevenue = 0;
    const withCum = byRevenue.map((r) => {
        cum += r.revenue;
        const cumulativeSharePct = safePercent(cum, totalRevenue);
        return { ...r, cumulativeSharePct };
    });

    for (const r of withCum) {
        if (r.cumulativeSharePct <= 80 + 0.001 || paretoCount === 0) {
            paretoCount += 1;
            paretoRevenue += r.revenue;
            if (r.cumulativeSharePct >= 80) break;
        } else {
            break;
        }
    }

    const byUnits = byRevenue.map((r) => ({ ...r, likes: undefined })).sort((a, b) => b.units - a.units);
    // Limpiar claves no necesarias
    const unitsRows = byUnits.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        units: round2(r.units),
        revenue: round2(r.revenue),
        revenueSharePct: r.revenueSharePct,
        profit: round2(r.revenue - r.cost),
    }));
    const revenueRows = withCum.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        units: round2(r.units),
        revenue: round2(r.revenue),
        revenueSharePct: r.revenueSharePct,
        cumulativeSharePct: round2(r.cumulativeSharePct),
        isPareto80: r.cumulativeSharePct <= 80.001 || false,
        profit: round2(r.revenue - r.cost),
    }));

    return {
        byUnits: unitsRows,
        byRevenue: revenueRows.map((r, i) => ({ ...r, isPareto80: i < paretoCount })),
        totalRevenue: round2(totalRevenue),
        totalUnits: round2(totalUnits),
        exchangeRate: rate,
        pareto: {
            count: paretoCount,
            revenue: round2(paretoRevenue),
            revenueSharePct: safePercent(paretoRevenue, totalRevenue),
            headCount: Math.max(1, Math.round(base.length * 0.2)),
        },
    };
}

// ---------------------------------------------------------------------------
// 4. VENTAS POR MÉTODO DE PAGO
// ---------------------------------------------------------------------------
const normalizeText = (value: string): string =>
    (value || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function paymentBucket(paymentMethod: string): { key: string; label: string } {
    const m = normalizeText(paymentMethod);
    const isUsd = /USD|DOLAR/.test(m) || (m.includes('$') && !m.includes('C$'));
    if (isUsd) return { key: 'usd', label: 'Dólares (USD)' };
    if (/CREDIT|FIADO/.test(m)) return { key: 'credito', label: 'Crédito / Abonos' };
    if (/CASH|EFECTIVO|CONTADO/.test(m)) return { key: 'efectivo', label: 'Efectivo' };
    if (/TRANSF|SINPE|PAGO MOVIL|PAGO MOVIL|YOMPAGO|LIGA|BANCO|TELER|MOVIL/.test(m)) return { key: 'transferencia', label: 'Transferencia' };
    if (/CARD|TARJETA|TC\b|DEBIT/.test(m)) return { key: 'tarjeta', label: 'Tarjeta' };
    return { key: 'otro', label: 'Otro' };
}

export async function getReportPaymentMethods(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end, false);
    const rate = await getExchangeRateValue();

    const buckets: Record<string, { key: string; label: string; count: number; total: number; sets: Set<string> }> = {};

    for (const inv of invoices) {
        const { key, label } = paymentBucket(inv.paymentMethod);
        const b = (buckets[key] ||= { key, label, count: 0, total: 0, sets: new Set() });
        b.count += 1;
        b.total += Number(inv.totalAmount) || 0;
        b.sets.add(inv.id);
    }

    const total = invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);

    const rows = Object.values(buckets)
        .map((b) => ({
            key: b.key,
            label: b.label,
            count: b.count,
            total: round2(b.total),
            sharePct: safePercent(b.total, total),
            transactions: b.sets.size,
        }))
        .sort((a, b) => b.total - a.total);

    return {
        rows,
        total: round2(total),
        totalUSD: round2(total / rate),
        exchangeRate: rate,
    };
}

// ---------------------------------------------------------------------------
// 5. VENTAS POR CAJERO / TURNO
// ---------------------------------------------------------------------------
export async function getReportCashiers(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const rate = await getExchangeRateValue();

    const perUser = new Map<string, any>();
    const ensureUser = (userId: string, name: string) => {
        if (!perUser.has(userId)) {
            perUser.set(userId, {
                userId,
                name: name || 'Cajero',
                invoiceCount: 0,
                revenue: 0,
                units: 0,
                cost: 0,
            });
        }
        return perUser.get(userId);
    };

    for (const inv of invoices) {
        const u = inv.user as any;
        const userId = u?.id || inv.userId;
        const row = ensureUser(userId, u?.name || 'Cajero');
        row.invoiceCount += 1;
        row.revenue += Number(inv.totalAmount) || 0;
        for (const item of inv.salesInvoiceItem || []) {
            row.units += unitCountFor(item);
        }
    }

    const whereSession: any = { status: 'closed' };
    if (start || end) {
        whereSession.openingTime = {};
        if (start) whereSession.openingTime.gte = start.toISOString();
        if (end) whereSession.openingTime.lte = end.toISOString();
    }

    const sessions = (await db.cashRegisterSession.findMany({
        where: whereSession,
        select: {
            id: true,
            cashierId: true,
            cashierName: true,
            difference: true,
            differenceUSD: true,
            actualCash: true,
            actualUSD: true,
            totalSales: true,
        },
    })) as any[];

    const sessionAgg = new Map<string, { sessions: number; difference: number; differenceUSD: number }>();
    for (const s of sessions) {
        const row = sessionAgg.get(s.cashierId) || { sessions: 0, difference: 0, differenceUSD: 0 };
        row.sessions += 1;
        row.difference += Number(s.difference) || 0;
        row.differenceUSD += Number(s.differenceUSD) || 0;
        sessionAgg.set(s.cashierId, row);
    }

    for (const [cid, s] of sessionAgg) {
        ensureUser(cid, sessions.find((x) => x.cashierId === cid)?.cashierName || 'Cajero');
    }

    const rows = Array.from(perUser.values())
        .map((r) => {
            const s = sessionAgg.get(r.userId);
            return {
                userId: r.userId,
                name: r.name,
                invoiceCount: r.invoiceCount,
                revenue: round2(r.revenue),
                revenueUSD: round2(r.revenue / rate),
                units: round2(r.units),
                avgTicket: r.invoiceCount > 0 ? round2(r.revenue / r.invoiceCount) : 0,
                sessions: s?.sessions || 0,
                difference: round2(s?.difference || 0),
                differenceUSD: round2(s?.differenceUSD || 0),
            };
        })
        .sort((a, b) => b.revenue - a.revenue);

    return {
        rows,
        total: {
            revenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
            revenueUSD: round2(rows.reduce((s, r) => s + r.revenueUSD, 0)),
            units: round2(rows.reduce((s, r) => s + r.units, 0)),
            invoices: rows.reduce((s, r) => s + r.invoiceCount, 0),
            difference: round2(rows.reduce((s, r) => s + r.difference, 0)),
        },
        exchangeRate: rate,
    };
}

// ---------------------------------------------------------------------------
// 6. VENTAS POR HORA (HORAS PICO)
// ---------------------------------------------------------------------------
export async function getReportSalesByHour(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end, false);

    const hours = Array.from({ length: 24 }, (_, h) => {
        const hourLabel = `${String(h).padStart(2, '0')}:00`;
        return { hour: h, label: hourLabel, count: 0, sales: 0 };
    });

    for (const inv of invoices) {
        const d = new Date(inv.date);
        const h = d.getHours();
        hours[h].count += 1;
        hours[h].sales += Number(inv.totalAmount) || 0;
    }

    const totalSales = hours.reduce((s, h) => s + h.sales, 0);
    const peak = [...hours].sort((a, b) => b.sales - a.sales)[0];

    return {
        hours: hours.map((h) => ({ ...h, sales: round2(h.sales), sharePct: safePercent(h.sales, totalSales) })),
        peak: peak ? { hour: peak.hour, label: peak.label, sales: round2(peak.sales), count: peak.count } : null,
        totalSales: round2(totalSales),
    };
}

// ---------------------------------------------------------------------------
// 7. PRODUCTOS SIN ROTACIÓN (STOCK MUERTO)
// ---------------------------------------------------------------------------
export async function getReportDeadStock(days?: number | string, to?: string) {
    const window = Math.max(1, Math.min(3650, Number(days) || 90));
    const end = parseDate(to) || new Date();
    const cutoff = new Date(end.getTime() - window * 86400000);

    const soldItems = await db.salesInvoiceItem.findMany({
        where: {
            salesInvoice: { status: 'COMPLETED', date: { gte: cutoff } },
            quantity: { gt: 0 },
        },
        select: { productId: true },
    });
    const soldIdSet = new Set<string>(soldItems.map((s) => s.productId));

    const inventory = (await db.inventoryItem.findMany({
        where: { quantity: { gt: 0 } },
        select: { productId: true, quantity: true },
    })) as any[];

    const stockByProduct = new Map<string, number>();
    for (const i of inventory) {
        stockByProduct.set(i.productId, (stockByProduct.get(i.productId) || 0) + (Number(i.quantity) || 0));
    }

    const products = (await db.product.findMany({
        select: {
            id: true,
            name: true,
            barcode: true,
            costPriceNIO: true,
            category: true,
            categoryId: true,
        },
    })) as any[];

    const catById = new Map<string, any>();
    const cats = (await db.category.findMany({ select: { id: true, name: true, parentId: true } })) as any[];
    for (const c of cats) catById.set(c.id, c);

    const rows: any[] = [];
    for (const p of products) {
        const stock = stockByProduct.get(p.id) || 0;
        if (stock <= 0) continue;
        if (soldIdSet.has(p.id)) continue;
        const cat = p.categoryId ? catById.get(p.categoryId) : undefined;
        rows.push({
            productId: p.id,
            productName: p.name,
            barcode: p.barcode || '',
            categoryName: cat?.name || p.category || 'Sin categoría',
            stockQuantity: stock,
            costNIO: round2(stock * (p.costPriceNIO || 0)),
            days,
            status: 'Sin ventas',
        });
    }

    rows.sort((a, b) => a.stockQuantity - b.stockQuantity || b.costNIO - a.costNIO);

    return {
        rows,
        days: window,
        count: rows.length,
        stockInactiveUnits: rows.reduce((s, r) => s + r.stockQuantity, 0),
        costValueInactive: round2(rows.reduce((s, r) => s + r.costNIO, 0)),
    };
}

// ---------------------------------------------------------------------------
// 8. UTILIDAD / MARGEN DE GANANCIA
// ---------------------------------------------------------------------------
export async function getReportProfitMargin(from?: string, to?: string) {
    const { start, end } = buildInvoiceRange(parseDate(from), parseDate(to));
    const invoices = await fetchInvoicesInRange(start, end);
    const rate = await getExchangeRateValue();
    const { productById } = await getReportProductCatalog();

    interface ItemAgg {
        productId: string;
        productName: string;
        units: number;
        revenue: number;
        cost: number;
        invoices: number;
    }

    const agg = new Map<string, ItemAgg>();
    for (const inv of invoices) {
        for (const item of inv.salesInvoiceItem || []) {
            const key = item.productId || `name:${item.productName}`;
            let row = agg.get(key);
            if (!row) {
                const p = item.productId ? productById.get(item.productId) : undefined;
                row = { productId: key, productName: p?.name || item.productName, units: 0, revenue: 0, cost: 0, invoices: 0 };
                agg.set(key, row);
            }
            const units = unitCountFor(item);
            row.units += units;
            row.revenue += Number(item.totalPrice) || 0;
            row.cost += (productById.get(item.productId)?.cost || 0) * units;
            row.invoices += 1;
        }
    }

    const items = Array.from(agg.values())
        .map((r) => ({
            productId: r.productId,
            productName: r.productName,
            units: round2(r.units),
            avgUnitPrice: r.units > 0 ? round2(r.revenue / r.units) : 0,
            avgUnitCost: r.units > 0 ? round2(r.cost / r.units) : 0,
            totalRevenue: round2(r.revenue),
            totalCost: round2(r.cost),
            profit: round2(r.revenue - r.cost),
            profitUSD: round2((r.revenue - r.cost) / rate),
            marginPct: safePercent(r.revenue - r.cost, r.revenue),
            invoices: r.invoices,
        }))
        .sort((a, b) => b.profit - a.profit);

    const totalRevenue = items.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCost = items.reduce((s, r) => s + r.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;

    const bandsDef = [
        { min: -Infinity, max: 0, label: 'Pérdida' },
        { min: 0, max: 10, label: '0 – 10%' },
        { min: 10, max: 20, label: '10 – 20%' },
        { min: 20, max: 30, label: '20 – 30%' },
        { min: 30, max: 50, label: '30 – 50%' },
        { min: 50, max: Infinity, label: '+ 50%' },
    ];
    const bands = bandsDef.map((b) => ({
        label: b.label,
        count: items.filter((r) => r.marginPct >= b.min && r.marginPct < b.max).length,
    }));

    return {
        items,
        topByProfit: items.slice(0, 15),
        summary: {
            totalRevenue: round2(totalRevenue),
            totalRevenueUSD: round2(totalRevenue / rate),
            totalCost: round2(totalCost),
            totalProfit: round2(totalProfit),
            totalProfitUSD: round2(totalProfit / rate),
            marginPct: safePercent(totalProfit, totalRevenue),
            invoiceCount: new Set(invoices.map((i) => i.id)).size,
            units: round2(items.reduce((s, r) => s + r.units, 0)),
            positiveProducts: items.filter((r) => r.profit > 0).length,
            negativeProducts: items.filter((r) => r.profit < 0).length,
        },
        bands,
        exchangeRate: rate,
    };
}

// ---------------------------------------------------------------------------
// FILTROS GENERALES (categorías, ubicaciones y cajeros)
// ---------------------------------------------------------------------------
export async function getReportFilters() {
    const { categories } = await getReportProductCatalog();

    const users = (await db.user.findMany({
        where: { role: { in: ['cashier', 'dispatcher', 'admin', 'master-admin'] } },
        select: { id: true, name: true, role: true, assignedLocation: true },
        orderBy: { name: 'asc' },
    })) as any[];

    const locations = Array.from(new Set(users.map((u) => u.assignedLocation || 'Sin ubicación'))).sort();

    return {
        categories: categories.map((c: any) => ({ id: c.id, name: c.name, parentId: c.parentId, inventoryType: c.inventoryType })),
        locations,
        cashiers: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
        defaultExchangeRate: 36.5,
    };
}

// ---------------------------------------------------------------------------
// ANTIGÜEDAD DE SALDOS (CxC y CxP)
// ---------------------------------------------------------------------------
type AgingBucket = 'current' | 'd31_60' | 'd61_90' | 'd90plus';

function agingBucketOf(reference: Date, now: Date): AgingBucket {
    const days = Math.floor((now.getTime() - reference.getTime()) / 86400000);
    if (days <= 30) return 'current';
    if (days <= 60) return 'd31_60';
    if (days <= 90) return 'd61_90';
    return 'd90plus';
}

function emptyAgingTotals() {
    return { current: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0, count: 0 };
}

function addToTotals(totals: any, bucket: AgingBucket, amount: number, count = 1) {
    totals[bucket] = Math.round((Number(totals[bucket]) + amount) * 100) / 100;
    totals.total = Math.round((Number(totals.total) + amount) * 100) / 100;
    totals.count += count;
}

function parseDateString(v: string | null | undefined): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Reporte de antigüedad de saldos:
 *  - CxC: facturas de venta a crédito con saldo pendiente, agrupadas por cliente
 *         en buckets Corriente (0-30), 31-60, 61-90 y >90 días (según la fecha de la factura).
 *  - CxP: cuentas por pagar con saldo pendiente, agrupadas por proveedor según
 *         su fecha de vencimiento (dueDate).
 */
export async function getAgingReport() {
    try {
        const now = new Date();
        const rate = await getExchangeRateValue();
        const round2 = (n: number) => Math.round(n * 100) / 100;

        // ---- CxC: facturas a crédito con saldo pendiente ----
        const creditInvoices = await db.salesInvoice.findMany({
            where: { status: 'COMPLETED', pendingBalance: { gt: 0.005 } },
            select: {
                id: true,
                invoiceNumber: true,
                date: true,
                totalAmount: true,
                pendingBalance: true,
                customerId: true,
                customer: { select: { id: true, fullName: true, phone: true, documentId: true } },
            },
            orderBy: { date: 'asc' },
        });

        const cxcByCustomer = new Map<string, any>();
        const cxcTotals = emptyAgingTotals();

        for (const inv of creditInvoices) {
            const amount = round2(Number(inv.pendingBalance) || 0);
            const bucket = agingBucketOf(inv.date, now);
            addToTotals(cxcTotals, bucket, amount, 1);

            const cust = inv.customer || { id: inv.customerId, fullName: '(Cliente eliminado)', phone: null, documentId: null };
            const custId = cust.id ?? 'SIN_CLIENTE';
            if (!cxcByCustomer.has(custId)) {
                cxcByCustomer.set(custId, {
                    customerId: cust.id,
                    customerName: cust.fullName,
                    phone: cust.phone,
                    documentId: cust.documentId,
                    invoiceCount: 0,
                    ...emptyAgingTotals(),
                    detail: [],
                });
            }
            const row = cxcByCustomer.get(custId);
            row.invoiceCount += 1;
            addToTotals(row, bucket, amount, 0);
            row.detail.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                date: inv.date,
                totalAmount: round2(Number(inv.totalAmount) || 0),
                pendingBalance: amount,
                bucket,
            });
        }

        const cxcRows = Array.from(cxcByCustomer.values()).sort((a, b) => b.total - a.total);

        // ---- CxP: cuentas por pagar con saldo pendiente ----
        const payables = await db.accountsPayable.findMany({
            where: { status: 'PENDING', amount: { gt: 0 } },
            include: {
                supplier: { select: { id: true, name: true } },
                purchaseInvoice: { select: { id: true, invoiceNumber: true, date: true, dueDate: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        const cxpBySupplier = new Map<string, any>();
        const cxpTotals = emptyAgingTotals();

        for (const ap of payables) {
            const remaining = round2((Number(ap.amount) || 0) - (Number(ap.paidAmount) || 0));
            if (remaining <= 0.005) continue;

            const reference =
                parseDateString(ap.purchaseInvoice?.dueDate) ||
                parseDateString(ap.purchaseInvoice?.date) ||
                ap.createdAt;
            const bucket = agingBucketOf(reference, now);
            addToTotals(cxpTotals, bucket, remaining, 1);

            if (!cxpBySupplier.has(ap.supplierId)) {
                cxpBySupplier.set(ap.supplierId, {
                    supplierId: ap.supplierId,
                    supplierName: ap.supplier?.name || '(Proveedor eliminado)',
                    invoiceCount: 0,
                    ...emptyAgingTotals(),
                    detail: [],
                });
            }
            const row = cxpBySupplier.get(ap.supplierId);
            row.invoiceCount += 1;
            addToTotals(row, bucket, remaining, 0);
            row.detail.push({
                invoiceId: ap.invoiceId,
                invoiceNumber: ap.purchaseInvoice?.invoiceNumber,
                date: ap.purchaseInvoice?.date,
                dueDate: ap.purchaseInvoice?.dueDate,
                amount: round2(Number(ap.amount) || 0),
                paidAmount: round2(Number(ap.paidAmount) || 0),
                remaining,
                bucket,
            });
        }

        const cxpRows = Array.from(cxpBySupplier.values()).sort((a, b) => b.total - a.total);

        return {
            success: true,
            data: {
                cxc: { rows: cxcRows, totals: cxcTotals },
                cxp: { rows: cxpRows, totals: cxpTotals },
                generatedAt: now.toISOString(),
                exchangeRate: rate,
            },
        };
    } catch (error) {
        console.error('Error generating aging report:', error);
        return { success: false, error: 'No se pudo generar el reporte de antigüedad de saldos' };
    }
}
