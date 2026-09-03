'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';

export interface NotificationData {
    id: string;
    type: string;
    message: string;
    read: boolean;
    createdAt: Date;
    userId?: string | null;
}

export async function getNotifications(userId?: string): Promise<NotificationData[]> {
    const whereClause: any = {
        read: false // Only fetch unread for now, or maybe last 10
    };

    if (userId) {
        whereClause.OR = [
            { userId: userId },
            { userId: null } // Global notifications
        ];
    }

    const notifications = await db.notification.findMany({
        where: whereClause,
        orderBy: {
            createdAt: 'desc'
        },
        take: 20
    });

    return notifications.map(n => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        userId: n.userId
    }));
}

export async function markAsRead(id: string) {
    await db.notification.update({
        where: { id },
        data: { read: true }
    });
}

export async function createNotification(type: 'info' | 'warning' | 'success' | 'error', message: string, userId?: string) {
    await db.notification.create({
        data: {
            id: generateUUID(),
            type,
            message,
            userId
        } as any
    });
}

export async function notifyLowStock(productName: string) {
    await createNotification(
        'warning',
        `Stock bajo: El producto "${productName}" ha alcanzado el nivel mínimo de inventario.`
    );
}

export async function notifyExpiringProduct(productName: string, date: string) {
    await createNotification(
        'warning',
        `Vencimiento próximo: El producto "${productName}" vence el ${new Date(date).toLocaleDateString()}.`
    );
}

export async function notifyRegisterOpened(cashierName: string) {
    await createNotification(
        'info',
        `Caja abierta: El usuario ${cashierName} ha iniciado una nueva sesión de caja.`
    );
}

export async function checkUnclosedBoxes() {
    const openSessions = await db.cashRegisterSession.findMany({
        where: { status: 'open' }
    });

    const now = new Date();
    for (const session of openSessions) {
        const openingTime = new Date(session.openingTime);
        const diffHours = (now.getTime() - openingTime.getTime()) / (1000 * 60 * 60);

        if (diffHours >= 24) {
            const message = `❌ ALERTA: La caja de ${session.cashierName} permanece ABIERTA hace más de 24 horas.`;
            
            // Avoid duplicate notifications (even if read) for the same session alert
            const existing = await db.notification.findFirst({
                where: {
                    message: { contains: `caja de ${session.cashierName} permanece ABIERTA` },
                    createdAt: {
                        gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) // Within the last 24h
                    }
                }
            });

            if (!existing) {
                await createNotification('error', message);
            }
        }
    }
}
