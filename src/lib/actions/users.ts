'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { User, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

import { verifySession } from '../session';

export async function getUsers() {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const users = await db.user.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: users };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { success: false, error: 'Failed to fetch users' };
    }
}

export async function getUserById(id: string) {
    const session = await verifySession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const user = await db.user.findUnique({
            where: { id }
        });
        return { success: true, data: user };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: 'Failed to fetch user' };
    }
}

export async function createUser(data: Prisma.UserCreateInput) {
    const session = await verifySession();
    if (!session || session.role !== 'master-admin') return { success: false, error: 'Unauthorized' };

    try {
        const createData = { ...data };
        if (createData.password) {
            createData.password = await bcrypt.hash(createData.password as string, 10);
        }

        const user = await db.user.create({
            data: {
                ...createData,
                id: generateUUID(),
                assignedLocation: (createData as any).assignedLocation || "ALL"
            } as any
        });
        revalidatePath('/users');
        return { success: true, data: user };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
    }
}

export async function updateUser(id: string, data: Partial<User>) {
    const session = await verifySession();
    if (!session || session.role !== 'master-admin') return { success: false, error: 'Unauthorized' };

    try {
        const updateData = { ...data };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        const user = await db.user.update({
            where: { id },
            data: {
                ...updateData,
                assignedLocation: (updateData as any).assignedLocation
            }
        });
        revalidatePath('/users');
        return { success: true, data: user };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update user' };
    }
}

export async function deleteUser(id: string) {
    const session = await verifySession();
    if (!session || session.role !== 'master-admin') return { success: false, error: 'Unauthorized' };

    try {
        await db.user.delete({
            where: { id }
        });
        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}
