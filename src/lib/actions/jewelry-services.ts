'use server'

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';

export interface JewelryServiceData {
    id: string;
    description: string;
    amount: number;
    createdAt: Date;
}

/**
 * Registra un servicio de joyería (ej: limpieza, reparación)
 * Lo acumula como venta en efectivo dentro de la sesión activa de caja.
 */
export async function createJewelryService(
    sessionId: string,
    userId: string,
    description: string,
    amount: number
): Promise<{ success: boolean; error?: string; data?: JewelryServiceData }> {
    const session = await verifySession();
    if (!session) return { success: false, error: 'No autorizado' };

    if (!description.trim()) return { success: false, error: 'El nombre del servicio es obligatorio.' };
    if (amount <= 0) return { success: false, error: 'El precio debe ser mayor a 0.' };

    try {
        await db.$transaction(async (tx) => {
            // Crear el registro del servicio
            await tx.jewelryService.create({
                data: {
                    sessionId,
                    userId,
                    description: description.trim(),
                    amount,
                }
            });

            // Acumular en la sesión: suma al total de ventas (como efectivo) y a salesServices
            await tx.cashRegisterSession.update({
                where: { id: sessionId },
                data: {
                    totalSales: { increment: amount },
                    salesCash: { increment: amount },  // Siempre efectivo
                    salesServices: { increment: amount },
                }
            });
        });

        revalidatePath('/pos');
        revalidatePath('/cash-register/close');
        revalidatePath('/dashboard');

        return { success: true };
    } catch (error) {
        console.error('Error creating jewelry service:', error);
        return { success: false, error: 'Error al registrar el servicio.' };
    }
}

/**
 * Obtiene todos los servicios registrados para una sesión de caja.
 */
export async function getSessionServices(sessionId: string): Promise<JewelryServiceData[]> {
    const session = await verifySession();
    if (!session) return [];

    const services = await db.jewelryService.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
    });

    return services.map(s => ({
        id: s.id,
        description: s.description,
        amount: s.amount,
        createdAt: s.createdAt,
    }));
}
