'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { ManagedUser, UserRole } from '../types';
import bcrypt from 'bcryptjs';
import { recordAudit } from './audit';

export async function checkUsersExist(): Promise<{ exists: boolean; error?: string }> {
    try {
        const count = await db.user.count();
        return { exists: count > 0 };
    } catch (error) {
        console.error('Database connection error:', error);
        return { exists: false, error: 'No se pudo conectar con la base de datos. Por favor, asegúrese de que el servidor MySQL esté en ejecución.' };
    }
}

export async function registerFirstUser(data: { name: string; password: string; }): Promise<{ success: boolean; error?: string }> {
    try {
        const userCount = await db.user.count();
        if (userCount > 0) {
            return { success: false, error: 'Ya existen usuarios en el sistema.' };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        await db.user.create({
            data: {
                id: generateUUID(),
                name: data.name,
                role: 'master-admin',
                password: hashedPassword,
                status: 'activo',
            } as any
        });

        return { success: true };
    } catch (error) {
        console.error('Error registering first user:', error);
        return { success: false, error: 'Error al crear el usuario.' };
    }
}

import { createSession, deleteSession, verifySession } from '../session';

export async function loginUser(name: string, password: string): Promise<{ success: boolean; user?: ManagedUser; error?: string }> {
    try {
        const user = await db.user.findFirst({
            where: {
                name: name,
                status: 'activo'
            }
        });

        if (!user) {
            return { success: false, error: 'Credenciales inválidas.' };
        }

        if (!user.isEnabled) {
            return { success: false, error: 'Usuario bloqueado. Contacte al administrador.' };
        }

        if (!user.password) {
            return { success: false, error: 'Credenciales inválidas.' };
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            const newFailedAttempts = (user.failedAttempts || 0) + 1;
            let errorMessage = 'Credenciales inválidas.';

            if (newFailedAttempts >= 6) {
                await db.user.update({
                    where: { id: user.id },
                    data: {
                        failedAttempts: newFailedAttempts,
                        isEnabled: false
                    }
                });
                return { success: false, error: 'Usuario bloqueado por múltiples intentos fallidos.' };
            } else {
                await db.user.update({
                    where: { id: user.id },
                    data: { failedAttempts: newFailedAttempts }
                });
                errorMessage = `Credenciales inválidas. Intento ${newFailedAttempts} de 6.`;
            }

            return { success: false, error: errorMessage };
        }

        // Reset failed attempts on successful login
        if (user.failedAttempts > 0) {
            await db.user.update({
                where: { id: user.id },
                data: { failedAttempts: 0 }
            });
        }

        // Create Session
        await createSession(user.id, user.role as UserRole);

        // AUDIT
        try {
            await recordAudit({
                userId: user.id,
                userName: user.name,
                action: 'LOGIN',
                entity: 'Auth',
                entityId: user.id,
                description: `Inició sesión: ${user.name}`,
                metadata: { role: user.role }
            });
        } catch (auditError) { console.error('Error recording login audit:', auditError); }

        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role as UserRole,
                status: user.status as 'activo' | 'inactivo',
                inventoryType: user.inventoryType as any,
                assignedLocation: (user as any).assignedLocation
            }
        };
    } catch (error) {
        console.error('Login error details:', error);
        return { success: false, error: 'Error al iniciar sesión.' };
    }
}

export async function logout() {
    const session = await verifySession();
    await deleteSession();

    // AUDIT
    if (session?.userId) {
        try {
            const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
            await recordAudit({
                userId: session.userId,
                userName: user?.name || 'Usuario',
                action: 'LOGOUT',
                entity: 'Auth',
                entityId: session.userId,
                description: `Cerró sesión: ${user?.name || 'Usuario'}`,
                metadata: {}
            });
        } catch (auditError) { console.error('Error recording logout audit:', auditError); }
    }

    return { success: true };
}

export async function getSession() {
    const session = await verifySession();
    if (!session) return null;

    // Optionally fetch fresh user data
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: {
            id: true,
            name: true,
            role: true,
            status: true,
            inventoryType: true,
            assignedLocation: true
        }
    });

    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        role: user.role as UserRole,
        status: user.status as 'activo' | 'inactivo',
        inventoryType: user.inventoryType as any,
        assignedLocation: (user as any).assignedLocation
    };
}

export async function resetPassword(username: string, recoveryKey: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Verify Recovery Key
        const settings = await db.systemSettings.findFirst();
        if (!settings || !settings.recoveryKey) {
            return { success: false, error: 'La llave de recuperación no ha sido configurada en el sistema.' };
        }

        if (settings.recoveryKey !== recoveryKey) {
            return { success: false, error: 'Llave de recuperación incorrecta.' };
        }

        // 2. Find User
        const user = await db.user.findFirst({
            where: { name: username }
        });

        if (!user) {
            return { success: false, error: 'Usuario no encontrado.' };
        }

        // 3. Update Password & Reset Status
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                failedAttempts: 0,
                isEnabled: true
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: 'Error al restablecer la contraseña.' };
    }
}
