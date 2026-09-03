'use server';
import { generateUUID } from '@/lib/uuid';

import db from '@/lib/db';
import { isValidLicense, isPremiumLicense, getLicenseType, computeExpirationDate, isDemoKey } from '@/lib/license-keys';
import { revalidatePath } from 'next/cache';
import { sendActivationNotification } from '@/lib/mail';

export async function checkActivationStatus() {
    try {
        let settings = await db.systemSettings.findFirst();
        console.log('Checking activation status. Settings found:', !!settings);

        // Si no está activado o no hay settings, buscar si hay datos existentes
        if (!settings || !settings.isActivated) {
            const userCount = await db.user.count();
            const pieceCount = await db.jewelryPiece.count();
            const productCount = await db.product.count();

            // Si hay usuarios o productos/piezas, el sistema tiene datos previos
            // de una instalación anterior. Auto-activamos para evitar bloqueo.
            if (userCount > 0 || pieceCount > 0 || productCount > 0) {
                console.log('Existing data detected (Users/Pieces). Auto-activating system settings...');
                
                if (settings) {
                    settings = await db.systemSettings.update({
                        where: { id: settings.id },
                        data: {
                            isActivated: true,
                            activationDate: new Date(),
                            isPremium: (settings as any).isPremium ?? false
                        } as any
                    });
                } else {
                    settings = await db.systemSettings.create({
                        data: {
                            id: generateUUID(),
                            updatedAt: new Date(),
                            isActivated: true,
                            activationDate: new Date(),
                            isPremium: false,
                            pharmacyName: 'Mi Joyería',
                            currency: 'NIO',
                            jewelryLocationMode: 'HOME'
                        } as any
                    });
                }
            }
        }

        return {
            isActivated: settings?.isActivated ?? false,
            isPremium: (settings as any)?.isPremium ?? false,
            error: null
        };
    } catch (error) {
        console.error('Error checking activation status:', error);
        return {
            isActivated: false,
            isPremium: false,
            error: 'Error de conexión con la base de datos'
        };
    }
}

export async function activateSystem(licenseKey: string) {
    try {
        // 1. Validar formato y existencia de la licencia
        const cleanKey = licenseKey.trim().toUpperCase();

        if (!isValidLicense(cleanKey)) {
            return {
                success: false,
                message: 'Licencia inválida. Por favor verifique el código.'
            };
        }

        // 2. Detectar tipo de licencia inteligente
        const licenseType = getLicenseType(cleanKey);
        const isPremium = licenseType === 'premium';
        const isAnnual = licenseType === 'annual';
        const isBasic = licenseType === 'basic';
        const isDemo = licenseType === 'demo' || licenseType === 'demo_15' || isDemoKey(cleanKey);

        const now = new Date();
        const expirationDate = computeExpirationDate(licenseType, now);

        // 3. Verificar si ya está activado
        const settings = await db.systemSettings.findFirst();

        // 4. Activar el sistema con el tipo de licencia correspondiente
        if (settings) {
            await db.systemSettings.update({
                where: { id: settings.id },
                data: {
                    isActivated: true,
                    activationDate: now,
                    licenseStartDate: now,
                    licenseExpirationDate: expirationDate,
                    licenseStatus: isDemo ? 'demo' : 'registered',
                    isPremium: isPremium
                } as any
            });
        } else {
            await db.systemSettings.create({
                data: {
                    id: generateUUID(),
                    updatedAt: new Date(),
                    isActivated: true,
                    activationDate: now,
                    licenseStartDate: now,
                    licenseExpirationDate: expirationDate,
                    licenseStatus: isDemo ? 'demo' : 'registered',
                    isPremium: isPremium,
                    pharmacyName: 'Mi Joyería',
                    currency: 'NIO'
                } as any
            });
        }

        let message = 'Sistema activado correctamente.';
        let typeName = 'Licencia Anual';

        if (isPremium) {
            message = '🎉 ¡Licencia Premium PERMANENTE activada! Todas las funciones han sido desbloqueadas.';
            typeName = 'PREMIUM PERMANENTE';
        } else if (isAnnual) {
            message = '¡Licencia ANUAL activada con éxito!';
            typeName = 'ANUAL CLÁSICA';
        } else if (isBasic) {
            message = '¡Licencia PERMANENTE CLÁSICA activada con éxito!';
            typeName = 'PERMANENTE CLÁSICA';
        } else if (isDemo) {
            const demoExpiration = expirationDate.toLocaleDateString('es-ES');
            message = `¡Licencia Demo activada con éxito! Su periodo de prueba vence el ${demoExpiration}.`;
            typeName = 'DEMO (15 Días)';
        }

        // Enviar notificación al desarrollador (sin esperar para no bloquear el UI)
        sendActivationNotification(cleanKey, settings?.pharmacyName || 'Nueva Instalación', typeName);

        revalidatePath('/');

        return {
            success: true,
                message
        };

    } catch (error: any) {
        console.error('Error activating system:', error);
        return {
            success: false,
            message: `Error al activar el sistema: ${error.message || 'Error desconocido'}. Verifique la conexión a la base de datos.`
        };
    }
}
