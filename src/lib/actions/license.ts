'use server'

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { sendActivationNotification } from '../mail';
import { computeExpirationDate, isDemoKey, getLicenseType } from '../license-keys';

export async function checkLicenseStatus() {
    const settings = await db.systemSettings.findFirst();
    if (!settings) return { 
        status: 'unregistered', 
        isExpired: true,
        isDemo: false,
        daysRemaining: 0,
        startDate: null,
        expirationDate: null
    };

    const now = new Date();
    const expirationDate = settings.licenseExpirationDate;
    const startDate = settings.licenseStartDate;

    const isDemo = !!settings.licenseStatus 
        ? settings.licenseStatus.toLowerCase().includes('demo')
        : false;

    if (!expirationDate) {
        return { 
            status: settings.licenseStatus || 'unregistered', 
            isExpired: true,
            isDemo,
            daysRemaining: 0,
            startDate,
            expirationDate: null
        };
    }

    const isExpired = now > expirationDate;

    // Días restantes (solo para consumo informativo en el header/settings)
    let daysRemaining = 0;
    if (!isExpired) {
        const msPerDay = 1000 * 60 * 60 * 24;
        daysRemaining = Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / msPerDay));
    }

    return {
        status: isExpired ? 'expired' : (settings.licenseStatus || 'registered'),
        isExpired,
        isDemo,
        daysRemaining,
        startDate,
        expirationDate
    };
}

export async function renewLicense(years: number = 1) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'Unauthorized' };
    }

    const settings = await db.systemSettings.findFirst();
    if (!settings) return { success: false, error: 'System settings not found' };

    const now = new Date();
    let newStartDate = settings.licenseStartDate || now;
    let currentExpiration = settings.licenseExpirationDate;

    // If already expired or never set, start from now
    let newExpirationDate = new Date(currentExpiration && currentExpiration > now ? currentExpiration : now);
    newExpirationDate.setFullYear(newExpirationDate.getFullYear() + years);

    await db.systemSettings.update({
        where: { id: settings.id },
        data: {
            licenseStartDate: newStartDate,
            licenseExpirationDate: newExpirationDate,
            licenseStatus: 'registered'
        }
    });
    
    // Notificación de renovación
    sendActivationNotification('BOTÓN RENEVAR', settings.pharmacyName, `RENOVACIÓN ANUAL (+${years} año/s)`);

    revalidatePath('/');
    return { success: true, newExpirationDate };
}

export async function activateInitialLicense() {
    // ... logic remains same or can be replaced by activateByKey
    return renewLicense(1);
}

const PERMANENT_KEYS = [
    "ABC123DEF", "XYZ789GHI", "MNO456PQR", "STU123VWX", "YZA789BCD",
    "EFG456HIJ", "KLM123NOP", "QRS789TUV", "WXY456ZAB", "CDE123FGH"
];

const ANNUAL_KEYS = [
    "ANV1-5829-XLZ", "ANV1-9472-MPK", "ANV1-3105-BWR", "ANV1-7684-DQT", "ANV1-2291-JSN",
    "ANV1-8530-HVG", "ANV1-4967-LFX", "ANV1-1742-KYZ", "ANV1-6318-PRM", "ANV1-5024-TWB"
];

const PREMIUM_KEYS = [
    "PREMIUM-2024-001", "PREMIUM-2024-002", "PREMIUM-2024-003", "PREMIUM-2024-004", "PREMIUM-2024-005",
    "PREMIUM-2024-006", "PREMIUM-2024-007", "PREMIUM-2024-008", "PREMIUM-2024-009", "PREMIUM-2024-010"
];

export async function activateLicenseByKey(key: string) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    const settings = await db.systemSettings.findFirst();
    if (!settings) return { success: false, error: 'Configuración no encontrada' };

    const trimmedKey = key.trim().toUpperCase();
    let isPermanent = PERMANENT_KEYS.includes(trimmedKey);
    let isAnnual = ANNUAL_KEYS.includes(trimmedKey);
    let isPremium = PREMIUM_KEYS.includes(trimmedKey);
    // Las claves demo (formato DEMO-XXXX-XXXX o listadas) se reconocen por formato
    let isDemo = isDemoKey(trimmedKey);

    if (!isPermanent && !isAnnual && !isPremium && !isDemo) {
        return { success: false, error: 'Código de licencia inválido' };
    }

    const licenseType = getLicenseType(trimmedKey);
    const now = new Date();
    const expirationDate = computeExpirationDate(licenseType, now);

    await db.systemSettings.update({
        where: { id: settings.id },
        data: {
            licenseStartDate: now,
            licenseExpirationDate: expirationDate,
            licenseStatus: isDemo ? 'demo' : 'registered',
            isPremium: isPremium // Activar premium si la llave es de esa lista
        }
    });

    let message = 'Licencia ANUAL activada';
    let typeName = 'ANUAL CLÁSICA';
    if (isPremium) {
        message = 'Licencia PREMIUM PERMANENTE activada';
        typeName = 'PREMIUM PERMANENTE';
    } else if (isPermanent) {
        message = 'Licencia PERMANENTE CLÁSICA activada';
        typeName = 'PERMANENTE CLÁSICA';
    } else if (isDemo) {
        const demoExpiration = expirationDate.toLocaleDateString('es-ES');
        message = `¡Licencia Demo activada con éxito! Su periodo de prueba vence el ${demoExpiration}.`;
        typeName = 'DEMO (15 Días)';
    }

    sendActivationNotification(trimmedKey, settings.pharmacyName, typeName);

    revalidatePath('/');
    return { 
        success: true, 
        message,
        expirationDate,
        isDemo
    };
}

