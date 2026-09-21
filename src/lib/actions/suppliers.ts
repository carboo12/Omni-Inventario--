'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { Supplier } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { verifySession } from '../session';

export async function getSuppliers() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Sesión no autorizada' };

    try {
        const suppliers = await db.supplier.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: suppliers };
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return { success: false, error: 'No se pudieron obtener los proveedores' };
    }
}

export async function getSupplierById(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Sesión no autorizada' };

    try {
        const supplier = await db.supplier.findUnique({
            where: { id }
        });
        return { success: true, data: supplier };
    } catch (error) {
        console.error('Error fetching supplier:', error);
        return { success: false, error: 'No se pudo obtener el proveedor' };
    }
}

export async function createSupplier(data: Omit<Supplier, 'id'>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Sesión no autorizada' };

    try {
        const supplier = await db.supplier.create({
            data: {
                ...data,
                id: generateUUID()
            } as any
        });
        revalidatePath('/suppliers');
        revalidatePath('/purchases');
        return { success: true, data: supplier };
    } catch (error) {
        console.error('Error creating supplier:', error);
        return { success: false, error: 'No se pudo crear el proveedor' };
    }
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Sesión no autorizada' };

    try {
        const supplier = await db.supplier.update({
            where: { id },
            data
        });
        revalidatePath('/suppliers');
        revalidatePath('/purchases');
        return { success: true, data: supplier };
    } catch (error) {
        console.error('Error updating supplier:', error);
        return { success: false, error: 'No se pudo actualizar el proveedor' };
    }
}

export async function deleteSupplier(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Sesión no autorizada' };

    try {
        await db.supplier.delete({
            where: { id }
        });
        revalidatePath('/suppliers');
        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return { success: false, error: 'No se pudo eliminar el proveedor' };
    }
}
