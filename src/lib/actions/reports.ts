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
