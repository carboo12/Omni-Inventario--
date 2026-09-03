// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'dashboard' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
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

export async function getDashboardStats(...args: any[]): Promise<any> {
  return callAction('dashboard', 'getDashboardStats', args);
}
