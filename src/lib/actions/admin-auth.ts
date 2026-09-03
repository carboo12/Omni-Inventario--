'use server'

import db from '../db';
import { compare } from 'bcryptjs';

export async function authorizeAction(username: string, pin: string) {
    try {
        const user = await db.user.findFirst({
            where: {
                name: username,
                role: { in: ['admin', 'master-admin', 'Administrador'] }
            }
        });

        if (!user || !user.password) {
            return { success: false, error: 'Usuario no encontrado o no es administrador.' };
        }

        const isValid = await compare(pin, user.password);

        if (!isValid) {
            return { success: false, error: 'Contraseña incorrecta.' };
        }

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Error de autorización.' };
    }
}
