'use server'

import db from '../db';
import { verifySession } from '../session';
import { revalidatePath } from 'next/cache';

/**
 * Sube un logo SVG para la farmacia (solo premium)
 */
export async function uploadLogo(svgContent: string) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    // Validar que sea SVG válido
    const trimmedContent = svgContent.trim();
    if (!trimmedContent.toLowerCase().includes('<svg')) {
        return { success: false, error: 'El archivo debe ser un SVG válido' };
    }

    // Validar tamaño (máximo 100KB)
    if (svgContent.length > 100000) {
        return { success: false, error: 'El SVG es demasiado grande (máximo 100KB)' };
    }

    try {
        const settings = await db.systemSettings.findFirst();

        if (!settings) {
            return { success: false, error: 'Configuración no encontrada' };
        }

        // Verificar licencia premium
        if (!settings.isPremium) {
            return { success: false, error: 'Esta funcionalidad requiere licencia premium' };
        }

        await db.systemSettings.update({
            where: { id: settings.id },
            data: { logoSvg: svgContent }
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Error uploading logo:', error);
        return { success: false, error: 'Error al subir logo' };
    }
}

/**
 * Elimina el logo de la farmacia
 */
export async function removeLogo() {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    try {
        const settings = await db.systemSettings.findFirst();

        if (!settings) {
            return { success: false, error: 'Configuración no encontrada' };
        }

        await db.systemSettings.update({
            where: { id: settings.id },
            data: { logoSvg: null }
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Error removing logo:', error);
        return { success: false, error: 'Error al eliminar logo' };
    }
}
