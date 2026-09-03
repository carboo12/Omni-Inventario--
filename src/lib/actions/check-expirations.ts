'use server'

import db from '../db';
import { notifyExpiringProduct } from './notifications';

export async function checkAndNotifyExpirations() {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30); // Check next 30 days

        const expiringItems = await db.inventoryItem.findMany({
            where: {
                expiryDate: {
                    lte: futureDate.toISOString(),
                    gte: today.toISOString()
                },
                quantity: {
                    gt: 0
                }
            }
        });

        let notificationsSent = 0;

        for (const item of expiringItems) {
            // Check if we already sent a notification for this item recently to avoid spam
            // For now, we'll just check if a notification exists with the exact message
            // In a real app, we might want a more robust deduplication strategy

            const message = `Vencimiento próximo: El producto "${item.productName}" vence el ${new Date(item.expiryDate).toLocaleDateString()}.`;

            const existingNotification = await db.notification.findFirst({
                where: {
                    message: message,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            });

            if (!existingNotification) {
                await notifyExpiringProduct(item.productName, item.expiryDate);
                notificationsSent++;
            }
        }

        return { success: true, count: notificationsSent };
    } catch (error) {
        console.error('Error checking expirations:', error);
        return { success: false, error: 'Failed to check expirations' };
    }
}
