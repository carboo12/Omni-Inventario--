'use server';
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { verifySession } from '../session';
import { revalidatePath } from 'next/cache';

// ==========================
// SIZES (TALLAS)
// ==========================

export async function getSizes() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const sizes = await db.size.findMany({
            where: { active: true },
            orderBy: { order: 'asc' }
        });
        return { success: true, data: sizes };
    } catch (error) {
        console.error('Error fetching sizes:', error);
        return { success: false, error: 'Failed to fetch sizes' };
    }
}

export async function createSize(data: { name: string; order?: number }) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const newSize = await db.size.create({
            data: {
                id: generateUUID(),
                name: data.name.trim().toUpperCase(),
                order: data.order || 0
            }
        });
        revalidatePath('/settings');
        revalidatePath('/inventory/new');
        return { success: true, data: newSize };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'La talla ya existe' };
        return { success: false, error: 'Failed to create size' };
    }
}

// ==========================
// COLORS (COLORES)
// ==========================

export async function getColors() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const colors = await db.color.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: colors };
    } catch (error) {
        console.error('Error fetching colors:', error);
        return { success: false, error: 'Failed to fetch colors' };
    }
}

export async function createColor(data: { name: string; hexCode?: string }) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const newColor = await db.color.create({
            data: {
                id: generateUUID(),
                name: data.name.trim().toUpperCase(),
                hexCode: data.hexCode
            }
        });
        revalidatePath('/settings');
        revalidatePath('/inventory/new');
        return { success: true, data: newColor };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'El color ya existe' };
        return { success: false, error: 'Failed to create color' };
    }
}

// ==========================
// VARIANTS LOGIC
// ==========================

/**
 * Utility function to generate a matrix of combinations.
 * Example: sizes [M, L] and colors [Red, Blue]
 * Returns: [{size: M, color: Red}, {size: M, color: Blue}, {size: L, color: Red}, ...]
 */
export async function generateCombinations(sizeIds: string[], colorIds: string[]) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const sizes = await db.size.findMany({ where: { id: { in: sizeIds } } });
        const colors = await db.color.findMany({ where: { id: { in: colorIds } } });

        const combinations = [];
        for (const size of sizes) {
            for (const color of colors) {
                combinations.push({
                    id: generateUUID(), // Temp ID for the frontend table
                    sizeId: size.id,
                    sizeName: size.name,
                    colorId: color.id,
                    colorName: color.name,
                    cost: 0,
                    price: 0,
                    stock: 0,
                    barcode: ''
                });
            }
        }
        return { success: true, data: combinations };
    } catch (error) {
        console.error('Error generating combinations:', error);
        return { success: false, error: 'Failed to generate combinations' };
    }
}
