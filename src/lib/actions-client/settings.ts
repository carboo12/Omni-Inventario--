// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'settings' (llaman a la API).
import { callAction } from '../api-client';

// Tipos copiados del action original (para no arrastrar código server al bundle).
export interface SystemSettingsData {
    id?: string;
    businessMode?: 'PHARMACY' | 'JEWELRY' | 'BOUTIQUE' | 'DISTRIBUIDORA';
    pharmacyName: string;
    // Ticket Personalization
    address?: string | null;
    phone?: string | null;
    rfc?: string | null;
    footerMessage?: string | null;
    website?: string | null;
    includeUnitPrice: boolean;
    printFullDescription: boolean;
    // General Config
    currency: string;
    taxRate: number;
    applyTax: boolean;
    recoveryKey?: string | null;
    workflow: string;
    quickSwitchEnabled: boolean;
    // Payment configuration
    exchangeRate: string;
    allowCash: boolean;
    blockInsufficientCash: boolean;
    allowDollars: boolean;
    allowCard: boolean;
    troyOunceGrams?: number;
    // Premium features
    isPremium: boolean;
    logoSvg?: string | null;
    // Jewelry Configuration
    jewelryLocationMode?: string;
    // Email notifications
    adminEmail: string;
    smtpEmail: string;
    smtpPassword: string;
    emailNotificationsEnabled: boolean;
    // License Management
    licenseStartDate?: Date | null;
    licenseExpirationDate?: Date | null;
    licenseStatus?: string;
    invoiceAlertDays?: number;
    importProductsInDollars?: boolean;
}

export async function getSettings(...args: any[]): Promise<any> {
  return callAction('settings', 'getSettings', args);
}

export async function updateSettings(...args: any[]): Promise<any> {
  return callAction('settings', 'updateSettings', args);
}
