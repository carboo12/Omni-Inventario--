// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'init-data' (llaman a la API).
import { callAction } from '../api-client';

import type { BusinessMode } from '@prisma/client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface InitialAppData {
  settings: {
    pharmacyName: string;
    address: string | null;
    phone: string | null;
    rfc: string | null;
    footerMessage: string | null;
    website: string | null;
    includeUnitPrice: boolean;
    printFullDescription: boolean;
    currency: string;
    taxRate: number;
    applyTax: boolean;
    recoveryKey: string | null;
    workflow: string;
    quickSwitchEnabled: boolean;
    exchangeRate: string;
    allowCash: boolean;
    blockInsufficientCash: boolean;
    allowDollars: boolean;
    allowCard: boolean;
    troyOunceGrams: number | null;
    isPremium: boolean;
    logoSvg: string | null;
    jewelryLocationMode: string | null;
    adminEmail: string | null;
    smtpEmail: string | null;
    smtpPassword: string | null;
    emailNotificationsEnabled: boolean;
    licenseStartDate: Date | null;
    licenseExpirationDate: Date | null;
    licenseStatus: string;
    invoiceAlertDays: number | null;
    importProductsInDollars: boolean | null;
  } | null;
  businessMode: BusinessMode;
  sessions: Array<{
    id: string;
    cashierId: string;
    cashierName: string;
    openingTime: string;
    closingTime?: string | null;
    initialAmount: number;
    initialAmountUSD?: number;
    finalAmount?: number | null;
    totalSales?: number | null;
    salesCash?: number;
    salesCard?: number;
    salesUSD?: number;
    salesServices?: number;
    salesCredit?: number;
    salesAbonos?: number;
    totalReturns?: number | null;
    actualCash?: number | null;
    actualUSD?: number | null;
    difference?: number | null;
    differenceUSD?: number | null;
    status: 'open' | 'closed';
  }>;
  user: {
    id: string;
    name: string;
    role: string;
    status: string | null;
    inventoryType: string | null;
    assignedLocation: string | null;
  } | null;
}

export async function getInitialAppData(...args: any[]): Promise<any> {
  return callAction('init-data', 'getInitialAppData', args);
}
