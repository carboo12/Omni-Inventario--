'use server'

import db from '../db';
import { UserRole, InventoryType } from '../types';

export interface DashboardStats {
    totalRevenue: number;
    totalInventoryCount: number;
    totalProducts: number;
    pendingApprovals: number;
    inventoryInvestment: number;
    lowStockCount: number;
    expiringProductsCount: number;
    todaysSalesCount: number;
    todaysSalesAmount: number;
    cashInRegister: number; // For cashier
    recentActivity: any[];
    openSessions?: any[];
    accountsPayable?: number;
    accountsReceivable?: number;
    stockMovementsToday?: number;
    jewelryStats?: {
        gramsByKarat: { karat: number; grams: number }[];
        totalInventoryValueUSD: number;
        totalInvestedUSD: number;
        totalSoldUSD: number;
        estimatedProfitUSD: number;
        currentMarketPrice: number;
    };
}

export async function getDashboardStats(role: UserRole, inventoryType?: InventoryType, userId?: string): Promise<DashboardStats> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);
    const next30DaysIso = next30Days.toISOString();
    const todayIso = today.toISOString();

    const isAdmin = role === 'master-admin' || role === 'admin';
    const isJewelry = inventoryType === 'jewelry';
    const isCashier = role === 'cashier' && !!userId;

    const inventoryWhere: any = {};
    if (role === 'dispatcher' || role === 'cashier') {
        if (inventoryType) inventoryWhere.inventoryType = inventoryType;
    }

    // ✅ OPTIMIZACIÓN: todas las queries en paralelo con Promise.all
    const [
        sessions,
        openSessionsRaw,
        inventoryItems,
        productVariants,
        totalProductsCount,
        pendingApprovals,
        accountsPayableResult,
        accountsReceivableResult,
        stockMovementsToday,
        recentActivity,
        cashierData,
        jewelryData,
    ] = await Promise.all([
        // 1. Total Revenue
        db.cashRegisterSession.findMany({ where: { status: 'closed' }, select: { totalSales: true } }),

        // 2. Open sessions (admin only)
        isAdmin
            ? db.cashRegisterSession.findMany({
                where: { status: 'open' },
                include: { user: { select: { name: true } } }
              })
            : Promise.resolve([]),

        // 3. Inventory items
        db.inventoryItem.findMany({
            where: inventoryWhere,
            include: { product: { select: { costPriceNIO: true, minStock: true } } }
        }),

        // 4. Variant inventory items
        db.productVariant.findMany({
            where: {
                active: true,
                product: Object.keys(inventoryWhere).length ? inventoryWhere : undefined,
            },
            include: {
                product: { select: { costPriceNIO: true, minStock: true } }
            }
        }),

        // 5. Total de productos / ítems del catálogo (distintos)
        db.product.count({
            where: Object.keys(inventoryWhere).length
                ? { inventoryType: (inventoryWhere as any).inventoryType }
                : undefined,
        }),

        // 6. Pending approvals count
        db.purchaseInvoice.count({ where: { status: { not: 'Pagada' } } }),

        // 6. Accounts payable sum (saldo pendiente = total - pagado)
        db.purchaseInvoice.aggregate({
            _sum: { totalAmount: true, paidAmount: true },
            where: { status: { not: 'Pagada' } }
        }),

        // 6b. Accounts receivable (Cuentas por Cobrar) — saldo pendiente de clientes
        db.customer.aggregate({
            _sum: { currentBalance: true }
        }),

        // 7. Stock movements today
        db.inventoryMovement.count({ where: { timestamp: { gte: startOfDay } } }),

        // 8. Recent activity
        db.inventoryMovement.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { name: true } } }
        }),

        // 9. Cashier-specific data (only when needed)
        isCashier
            ? Promise.all([
                db.cashRegisterSession.findFirst({ where: { cashierId: userId, status: 'open' }, select: { totalSales: true, initialAmount: true } }),
                db.cashRegisterSession.findMany({ where: { cashierId: userId, openingTime: { gte: startOfDay } }, select: { totalSales: true } }),
                db.inventoryMovement.findMany({
                    where: { userId, movementType: 'Venta', timestamp: { gte: startOfDay } },
                    select: { movementId: true },
                    distinct: ['movementId']
                }),
              ])
            : Promise.resolve(null),

        // 10. Jewelry stats (only when needed)
        isJewelry
            ? Promise.all([
                db.goldStock.findMany(),
                db.goldMarketPrice.findFirst({ orderBy: { createdAt: 'desc' } }),
                db.financialTransaction.findMany({ select: { type: true, amount: true } }),
                db.jewelryPiece.findMany({ where: { status: 'AVAILABLE' }, select: { calculatedPrice: true } }),
              ])
            : Promise.resolve(null),
    ]);

    // Process inventory
    const simpleInventoryCount = inventoryItems.reduce((acc: number, item) => acc + item.quantity, 0);
    const variantInventoryCount = productVariants.reduce((acc: number, item) => acc + item.stock, 0);
    const totalInventoryCount = simpleInventoryCount + variantInventoryCount;

    const simpleInventoryInvestment = inventoryItems.reduce((acc: number, item) => {
        return acc + (item.quantity * (item.product.costPriceNIO || 0));
    }, 0);
    const variantInventoryInvestment = productVariants.reduce((acc: number, item) => {
        return acc + (item.stock * (item.cost || item.product.costPriceNIO || 0));
    }, 0);
    const inventoryInvestment = simpleInventoryInvestment + variantInventoryInvestment;

    // Stock bajo / agotado: se evalúa sobre el STOCK TOTAL CONSOLIDADO del producto
    // (suma de todos los lotes por productId), no por lote individual.
    const stockByProduct = new Map<string, number>();
    for (const item of inventoryItems) {
        const id = item.productId || item.productName;
        stockByProduct.set(id, (stockByProduct.get(id) || 0) + item.quantity);
    }

    const lowStockProductIds = new Set<string>();
    for (const item of inventoryItems) {
        const total = stockByProduct.get(item.productId || item.productName) || 0;
        const min = item.product?.minStock ?? 10;
        if (total <= 0 || total < min) {
            lowStockProductIds.add(item.productId);
        }
    }

    const lowStockCount = lowStockProductIds.size
        + productVariants.filter((item: any) => item.stock > 0 && item.stock < (item.product.minStock || 1)).length;
    const expiringProductsCount = inventoryItems.filter((item: any) => {
        return item.expiryDate > todayIso && item.expiryDate <= next30DaysIso;
    }).length;

    // Total revenue
    const totalRevenue = sessions.reduce((acc: number, session) => acc + (session.totalSales || 0), 0);

    // Cashier stats
    let todaysSalesCount = 0;
    let todaysSalesAmount = 0;
    let cashInRegister = 0;
    if (isCashier && cashierData) {
        const [activeSession, todaySessions, salesMovements] = cashierData as any[];
        cashInRegister = (activeSession?.initialAmount || 0) + (activeSession?.totalSales || 0);
        todaysSalesAmount = todaySessions.reduce((acc: number, s: any) => acc + (s.totalSales || 0), 0);
        todaysSalesCount = salesMovements.length;
    }

    // Jewelry stats
    let jewelryStats = undefined;
    if (isJewelry && jewelryData) {
        const [goldStock, latestPrice, financials, pieces] = jewelryData as any[];
        const marketPrice = latestPrice?.pricePerOunceUSD || 0;
        const marketPricePerGram = marketPrice / 31.1035;
        const totalInvestedUSD = financials.filter((f: any) => f.type === 'EXPENSE').reduce((acc: number, f: any) => acc + f.amount, 0);
        const totalSoldUSD = financials.filter((f: any) => f.type === 'INCOME').reduce((acc: number, f: any) => acc + f.amount, 0);
        const piecesValue = pieces.reduce((acc: number, p: any) => acc + p.calculatedPrice, 0);
        const stockValue = goldStock.reduce((acc: number, s: any) => acc + (s.gramsAvailable * marketPricePerGram), 0);
        jewelryStats = {
            gramsByKarat: goldStock.map((s: any) => ({ karat: s.karat, grams: s.gramsAvailable })),
            totalInventoryValueUSD: piecesValue + stockValue,
            totalInvestedUSD,
            totalSoldUSD,
            estimatedProfitUSD: totalSoldUSD - totalInvestedUSD,
            currentMarketPrice: marketPrice
        };
    }

    return {
        totalRevenue,
        totalInventoryCount,
        totalProducts: totalProductsCount,
        pendingApprovals,
        inventoryInvestment,
        lowStockCount,
        expiringProductsCount,
        todaysSalesCount,
        todaysSalesAmount,
        cashInRegister,
        recentActivity,
        accountsPayable: (accountsPayableResult._sum.totalAmount || 0) - (accountsPayableResult._sum.paidAmount || 0),
        accountsReceivable: accountsReceivableResult?._sum?.currentBalance || 0,
        stockMovementsToday,
        openSessions: openSessionsRaw,
        jewelryStats
    } as DashboardStats;
}
