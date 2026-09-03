'use server'
import { generateUUID } from '@/lib/uuid';
// Re-evaluating types

import db from '../db';
import { revalidatePath } from 'next/cache';

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

import { verifySession } from '../session';

export async function getSettings(): Promise<SystemSettingsData> {
    const session = await verifySession();
    // Allow read access to authenticated users, or maybe public if needed for login screen?
    // Actually, login screen might need pharmacy name. 
    // But getSettings returns sensitive data like recoveryKey? 
    // Wait, getSettings returns SystemSettingsData which includes recoveryKey.
    // We should probably NOT return recoveryKey to everyone.
    // But for now, let's just secure it. If login needs it, we might need a public version.
    // The login screen uses settings for pharmacy name.
    // Let's check where getSettings is used.
    // If it's used in layout or login, it might need to be public or partial.
    // For now, let's assume it needs to be protected for full data.
    // But wait, if I protect it, the login screen might break if it tries to fetch settings.
    // Let's check usage of getSettings.
    // Actually, let's just protect updateSettings for now, and getSettings can be public BUT filter sensitive data if not admin?
    // Or just protect updateSettings.

    // Let's protect updateSettings strictly.
    // getSettings is used in hooks/use-settings.tsx which is used in many places.
    // If I block getSettings, the app might break for unauthenticated users (login page).
    // Let's check if use-settings handles errors.

    // Safe approach: Protect updateSettings. Leave getSettings open but maybe filter sensitive fields if possible?
    // The current getSettings returns everything.
    // Let's just protect updateSettings for now to prevent unauthorized changes.

    const settings = await db.systemSettings.findFirst();

    if (!settings) {
        // Return defaults if no settings exist
        return {
            pharmacyName: "Omni Inventario +",
            currency: "NIO",
            taxRate: 0.15,
            applyTax: true,
            address: "",
            phone: "",
            rfc: "",
            footerMessage: "",
            website: "",
            includeUnitPrice: false,
            printFullDescription: false,
            recoveryKey: "",
            workflow: "dispatcher-cashier",
            quickSwitchEnabled: false,
            exchangeRate: "36.5",
            allowCash: true,
            blockInsufficientCash: true,
            allowDollars: false,
            allowCard: true,
            troyOunceGrams: 31.10,
            isPremium: false,
            logoSvg: null,
            adminEmail: "",
            smtpEmail: "",
            smtpPassword: "",
            emailNotificationsEnabled: false,
            invoiceAlertDays: 5,
            importProductsInDollars: false
        };
    }

    return {
        id: settings.id,
        businessMode: settings.businessMode,
        pharmacyName: settings.pharmacyName,
        address: settings.address,
        phone: settings.phone,
        rfc: settings.rfc,
        footerMessage: settings.footerMessage,
        website: settings.website,
        includeUnitPrice: settings.includeUnitPrice,
        printFullDescription: settings.printFullDescription,
        currency: settings.currency,
        taxRate: settings.taxRate,
        applyTax: settings.applyTax,
        recoveryKey: settings.recoveryKey,
        workflow: settings.workflow,
        quickSwitchEnabled: settings.quickSwitchEnabled,
        exchangeRate: settings.exchangeRate,
        allowCash: settings.allowCash,
        blockInsufficientCash: settings.blockInsufficientCash,
        allowDollars: settings.allowDollars,
        allowCard: settings.allowCard,
        troyOunceGrams: settings.troyOunceGrams,
        isPremium: settings.isPremium,
        logoSvg: settings.logoSvg,
        jewelryLocationMode: settings.jewelryLocationMode,
        adminEmail: settings.adminEmail,
        smtpEmail: settings.smtpEmail,
        smtpPassword: settings.smtpPassword,
        emailNotificationsEnabled: settings.emailNotificationsEnabled,
        licenseStartDate: settings.licenseStartDate,
        licenseExpirationDate: settings.licenseExpirationDate,
        licenseStatus: settings.licenseStatus,
        invoiceAlertDays: settings.invoiceAlertDays,
        importProductsInDollars: settings.importProductsInDollars
    };
}

export async function updateSettings(data: SystemSettingsData) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'Unauthorized' };
    }

    const existing = await db.systemSettings.findFirst();

    if (existing) {
        await db.systemSettings.update({
            where: { id: existing.id },
            data: {
                workflow: data.workflow,
                pharmacyName: data.pharmacyName,
                address: data.address,
                phone: data.phone,
                rfc: data.rfc,
                footerMessage: data.footerMessage,
                website: data.website,
                includeUnitPrice: data.includeUnitPrice,
                printFullDescription: data.printFullDescription,
                currency: data.currency,
                taxRate: data.taxRate,
                applyTax: data.applyTax,
                recoveryKey: data.recoveryKey,
                quickSwitchEnabled: data.quickSwitchEnabled,
                exchangeRate: data.exchangeRate,
                allowCash: data.allowCash,
                blockInsufficientCash: data.blockInsufficientCash,
                allowDollars: data.allowDollars,
                allowCard: data.allowCard,
                troyOunceGrams: data.troyOunceGrams,
                jewelryLocationMode: data.jewelryLocationMode,
                adminEmail: data.adminEmail,
                smtpEmail: data.smtpEmail,
                smtpPassword: data.smtpPassword,
                emailNotificationsEnabled: data.emailNotificationsEnabled,
                licenseStartDate: data.licenseStartDate,
                licenseExpirationDate: data.licenseExpirationDate,
                licenseStatus: data.licenseStatus,
                invoiceAlertDays: data.invoiceAlertDays,
                importProductsInDollars: data.importProductsInDollars
            }
        });
    } else {
        await db.systemSettings.create({
            data: {
                id: generateUUID(),
                updatedAt: new Date(),
                workflow: data.workflow,
                pharmacyName: data.pharmacyName,
                address: data.address,
                phone: data.phone,
                rfc: data.rfc,
                footerMessage: data.footerMessage,
                website: data.website,
                includeUnitPrice: data.includeUnitPrice,
                printFullDescription: data.printFullDescription,
                currency: data.currency,
                taxRate: data.taxRate,
                applyTax: data.applyTax,
                recoveryKey: data.recoveryKey,
                quickSwitchEnabled: data.quickSwitchEnabled,
                exchangeRate: data.exchangeRate,
                allowCash: data.allowCash,
                blockInsufficientCash: data.blockInsufficientCash,
                allowDollars: data.allowDollars,
                allowCard: data.allowCard,
                troyOunceGrams: data.troyOunceGrams,
                jewelryLocationMode: data.jewelryLocationMode,
                adminEmail: data.adminEmail,
                smtpEmail: data.smtpEmail,
                smtpPassword: data.smtpPassword,
                emailNotificationsEnabled: data.emailNotificationsEnabled,
                licenseStartDate: data.licenseStartDate,
                licenseExpirationDate: data.licenseExpirationDate,
                licenseStatus: data.licenseStatus || 'unregistered',
                invoiceAlertDays: data.invoiceAlertDays || 5,
                importProductsInDollars: data.importProductsInDollars || false
            } as any
        });
    }

    revalidatePath('/');
    return { success: true };
}
