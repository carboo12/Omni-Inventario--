'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';

// Type for Category data
export type CategoryData = {
    name: string;
    description?: string | null;
    inventoryType: 'pharmacy' | 'general';
    parentId?: string | null;
}

export type CategoryWithChildren = {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    children: CategoryWithChildren[];
    _count?: {
        product: number;
        other_category?: number;
    }
}

// Obtener categorías por tipo de inventario
export async function getCategories(inventoryType?: 'pharmacy' | 'general') {
    const session = await verifySession();
    if (!session) {
        return { success: false, error: 'No autorizado' };
    }

    try {
        const where = inventoryType ? { inventoryType } : {};

        const allCategories = await db.category.findMany({
            where,
            include: {
                category: true,
                _count: { select: { product: true, other_category: true } }
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, data: allCategories };
    } catch (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: 'Error al obtener categorías' };
    }
}

export async function getCategoryTree() {
    try {
        const allCategories = await db.category.findMany({
            include: {
                _count: { select: { product: true } }
            },
            orderBy: { name: 'asc' }
        });

        const buildTree = (categories: any[], parentId: string | null = null): CategoryWithChildren[] => {
            return categories
                .filter(cat => cat.parentId === parentId)
                .map(cat => ({
                    ...cat,
                    children: buildTree(categories, cat.id)
                }));
        };

        const tree = buildTree(allCategories);
        return { success: true, data: tree };
    } catch (error) {
        console.error('Error fetching category tree:', error);
        return { success: false, error: 'Failed to fetch category tree' };
    }
}

export async function createCategory(data: CategoryData) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    // Validar nombre
    if (!data.name || data.name.trim() === '') {
        return { success: false, error: 'El nombre es requerido' };
    }

    try {
        // Verificar que no exista categoría con mismo nombre en mismo tipo
        const existing = await db.category.findFirst({
            where: {
                name: data.name,
                inventoryType: data.inventoryType
            }
        });

        if (existing) {
            return { success: false, error: 'Ya existe una categoría con ese nombre en este catálogo' };
        }

        // Verificar que el parentId existe si se proporciona
        if (data.parentId) {
            const parentExists = await db.category.findUnique({
                where: { id: data.parentId }
            });

            if (!parentExists) {
                return { success: false, error: 'La categoría padre seleccionada no existe' };
            }
        }

        const category = await db.category.create({
            data: {
                ...data,
                id: generateUUID(),
                updatedAt: new Date()
            } as any
        });
        revalidatePath('/categories');
        return { success: true, data: category };
    } catch (error) {
        console.error('Error creating category:', error);
        return { success: false, error: 'Error al crear categoría' };
    }
}

export async function updateCategory(id: string, data: Partial<CategoryData>) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    // Validar que no sea su propio padre
    if (data.parentId === id) {
        return { success: false, error: 'Una categoría no puede ser su propio padre' };
    }

    try {
        // Verificar que el parentId existe si se proporciona
        if (data.parentId) {
            const parentExists = await db.category.findUnique({
                where: { id: data.parentId }
            });

            if (!parentExists) {
                return { success: false, error: 'La categoría padre seleccionada no existe' };
            }
        }

        const category = await db.category.update({
            where: { id },
            data: data as any
        });
        revalidatePath('/categories');
        return { success: true, data: category };
    } catch (error) {
        console.error('Error updating category:', error);
        return { success: false, error: 'Error al actualizar categoría' };
    }
}

export async function deleteCategory(id: string) {
    const session = await verifySession();
    if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
        return { success: false, error: 'No autorizado' };
    }

    try {
        // Verificar productos y subcategorías
        const category = await db.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { product: true, other_category: true }
                }
            }
        });

        if (!category) {
            return { success: false, error: 'Categoría no encontrada' };
        }

        if (category._count.other_category > 0) {
            return { success: false, error: `No se puede eliminar. Esta categoría tiene ${category._count.other_category} subcategoría(s)` };
        }

        if (category._count.product > 0) {
            return { success: false, error: `No se puede eliminar. Hay ${category._count.product} producto(s) asignado(s)` };
        }

        await db.category.delete({
            where: { id }
        });
        revalidatePath('/categories');
        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: 'Error al eliminar categoría' };
    }
}
