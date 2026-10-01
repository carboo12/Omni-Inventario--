'use server'

import db from '../db';
import { verifySession } from '../session';
import { revalidatePath } from 'next/cache';
import type { PresentationLayout } from '../receipt-presentation';

export interface ReceiptSettingsData {
    fontFamily: string;
    ticketWidth: string;
    lineHeight: number;
    paddingX: number;
    fontSizeTitle: number;
    fontSizeHeader: number;
    fontSizeBody: number;
    fontSizePresentation: number;
    fontSizeTotals: number;
    fontSizeFooter: number;
    presentationLayout: PresentationLayout;
    presentationCustomFormat?: string;
    showLogo: boolean;
    showClientInfo: boolean;
    showEquivalenceUsd: boolean;
    footerMessage?: string | null;
}

export async function getReceiptSettings(): Promise<{ success: boolean; data?: ReceiptSettingsData; error?: string }> {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const settings = await db.receiptSettings.findFirst();
        if (!settings) {
            return {
                success: true,
                data: {
                    fontFamily: 'monospace',
                    ticketWidth: '80mm',
                    lineHeight: 1.2,
                    paddingX: 0,
                    fontSizeTitle: 16,
                    fontSizeHeader: 11,
                    fontSizeBody: 11,
                    fontSizePresentation: 9,
                    fontSizeTotals: 12,
                    fontSizeFooter: 10,
                    presentationLayout: 'BELOW_NAME',
                    presentationCustomFormat: '{cantidad} {presentacion} de: {nombre}',
                    showLogo: true,
                    showClientInfo: true,
                    showEquivalenceUsd: true,
                    footerMessage: '¡Gracias por su compra!'
                }
            };
        }
        const presentationLayout: PresentationLayout = ['BELOW_NAME', 'INLINE_QTY', 'CUSTOM'].includes(settings.presentationLayout)
            ? settings.presentationLayout as PresentationLayout
            : 'BELOW_NAME';
        return {
            success: true,
            data: {
                ...settings,
                presentationLayout,
                presentationCustomFormat: settings.presentationCustomFormat || '{cantidad} {presentacion} de: {nombre}',
            },
        };
    } catch (error) {
        console.error('Error fetching receipt settings:', error);
        return { success: false, error: 'Error al obtener configuración del ticket' };
    }
}

export async function updateReceiptSettings(data: ReceiptSettingsData): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const existing = await db.receiptSettings.findFirst();
        if (existing) {
            await db.receiptSettings.update({
                where: { id: existing.id },
                data
            });
        } else {
            await db.receiptSettings.create({
                data
            });
        }
        
        revalidatePath('/configuracion/ticket');
        revalidatePath('/pos');
        revalidatePath('/facturas');
        return { success: true };
    } catch (error) {
        console.error('Error updating receipt settings:', error);
        return { success: false, error: 'Error al guardar configuración del ticket' };
    }
}
