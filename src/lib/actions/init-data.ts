'use server';

import db from '../db';
import { verifySession } from '../session';
import { BusinessMode } from '@prisma/client';

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
    creditFinancingEnabled: boolean;
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

import { checkUnclosedBoxes } from './notifications';

/**
 * Carga TODOS los datos necesarios para el arranque del app en UNA SOLA request paralela.
 * En lugar de 5 llamadas separadas secuenciales a la DB, ejecuta todas en paralelo.
 */
export async function getInitialAppData(): Promise<InitialAppData> {
  const session = await verifySession();

  if (!session) {
    return {
      settings: null,
      businessMode: 'PHARMACY',
      sessions: [],
      user: null,
    };
  }

  // Trigger unclosed boxes check (non-blocking)
  checkUnclosedBoxes().catch(console.error);

  // Ejecutar TODAS las queries en paralelo con Promise.all
  const [settingsRow, sessionsRaw, userRow] = await Promise.all([
    db.systemSettings.findFirst(),
    db.cashRegisterSession.findMany({
      orderBy: { openingTime: 'desc' },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        inventoryType: true,
        assignedLocation: true,
      },
    }),
  ]);

  // Procesar sessions
  const sessions = sessionsRaw.map((s: any) => ({
    id: s.id,
    cashierId: s.cashierId,
    cashierName: s.cashierName,
    openingTime: s.openingTime,
    closingTime: s.closingTime,
    initialAmount: s.initialAmount,
    initialAmountUSD: s.initialAmountUSD ?? 0,
    finalAmount: s.finalAmount,
    totalSales: s.totalSales,
    salesCash: s.salesCash,
    salesCard: s.salesCard,
    salesUSD: s.salesUSD,
    salesServices: s.salesServices ?? 0,
    salesCredit: s.salesCredit ?? 0,
    salesAbonos: s.salesAbonos ?? 0,
    totalReturns: s.totalReturns,
    actualCash: s.actualCash,
    actualUSD: s.actualUSD ?? 0,
    difference: s.difference,
    differenceUSD: s.differenceUSD ?? 0,
    status: s.status as 'open' | 'closed',
  }));

  // businessMode proviene de SystemSettings (única fuente de verdad).
  const businessMode: BusinessMode = settingsRow?.businessMode ?? 'PHARMACY';

  return {
    settings: settingsRow
      ? {
          pharmacyName: settingsRow.pharmacyName,
          address: settingsRow.address,
          phone: settingsRow.phone,
          rfc: settingsRow.rfc,
          footerMessage: settingsRow.footerMessage,
          website: settingsRow.website,
          includeUnitPrice: settingsRow.includeUnitPrice,
          printFullDescription: settingsRow.printFullDescription,
          currency: settingsRow.currency,
          taxRate: settingsRow.taxRate,
          applyTax: settingsRow.applyTax,
          recoveryKey: settingsRow.recoveryKey,
          workflow: settingsRow.workflow,
          quickSwitchEnabled: settingsRow.quickSwitchEnabled,
          exchangeRate: settingsRow.exchangeRate,
          allowCash: settingsRow.allowCash,
          blockInsufficientCash: settingsRow.blockInsufficientCash,
          allowDollars: settingsRow.allowDollars,
          allowCard: settingsRow.allowCard,
          troyOunceGrams: settingsRow.troyOunceGrams,
          isPremium: settingsRow.isPremium,
          logoSvg: settingsRow.logoSvg,
          jewelryLocationMode: settingsRow.jewelryLocationMode,
          adminEmail: settingsRow.adminEmail,
          smtpEmail: settingsRow.smtpEmail,
          smtpPassword: settingsRow.smtpPassword,
          emailNotificationsEnabled: settingsRow.emailNotificationsEnabled,
          licenseStartDate: settingsRow.licenseStartDate,
          licenseExpirationDate: settingsRow.licenseExpirationDate,
          licenseStatus: settingsRow.licenseStatus,
          invoiceAlertDays: settingsRow.invoiceAlertDays,
          importProductsInDollars: settingsRow.importProductsInDollars,
          creditFinancingEnabled: settingsRow.creditFinancingEnabled || false,
        }
      : null,
    businessMode,
    sessions,
    user: userRow
      ? {
          id: userRow.id,
          name: userRow.name,
          role: userRow.role,
          status: userRow.status,
          inventoryType: userRow.inventoryType,
          assignedLocation: (userRow as any).assignedLocation,
        }
      : null,
  };
}
