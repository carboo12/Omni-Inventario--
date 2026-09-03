'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { Supplier } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { verifySession } from '../session';

export async function getSuppliers() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const suppliers = await db.supplier.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: suppliers };
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return { success: false, error: 'Failed to fetch suppliers' };
    }
}

export async function getSupplierById(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const supplier = await db.supplier.findUnique({
            where: { id }
        });
        return { success: true, data: supplier };
    } catch (error) {
        console.error('Error fetching supplier:', error);
        return { success: false, error: 'Failed to fetch supplier' };
    }
}

export async function createSupplier(data: Omit<Supplier, 'id'>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

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
        return { success: false, error: 'Failed to create supplier' };
    }
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

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
        return { success: false, error: 'Failed to update supplier' };
    }
}

export async function deleteSupplier(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        await db.supplier.delete({
            where: { id }
        });
        revalidatePath('/suppliers');
        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return { success: false, error: 'Failed to delete supplier' };
    }
}
