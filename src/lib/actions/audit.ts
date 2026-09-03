'use server'

import db from '../db';
import { revalidatePath } from 'next/cache';
import { generateUUID } from '@/lib/uuid';

interface AuditParams {
    userId: string;
    userName: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    metadata?: any;
    ipAddress?: string;
}

/**
 * Alias de recordAudit para mantener compatibilidad con el nombre
 * logAuditEvent usado como helper estándar de registro de auditoría.
 */
export async function logAuditEvent(params: AuditParams) {
    return recordAudit(params);
}

/**
 * Registra un evento en el log de auditoría
 */
export async function recordAudit(params: AuditParams) {
    try {
        const log = await db.auditLog.create({
            data: {
                id: generateUUID(),
                userId: params.userId,
                userName: params.userName,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                description: params.description,
                // Prisma AuditLog.metadata es String | Null: serializamos objetos a JSON.
                metadata: params.metadata
                    ? (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata))
                    : null,
                ipAddress: params.ipAddress ?? null
            } as any
        });
        
        // Revalidamos la ruta de auditoría (cuando exista)
        revalidatePath('/settings/audit');
        return { success: true, data: log };
    } catch (error) {
        console.error('Failed to record audit log:', error);
        return { success: false, error: 'Failed to record audit log' };
    }
}

/**
 * Obtiene los logs de auditoría para el administrador
 */
export async function getAuditLogs(limit = 100) {
    try {
        const logs = await db.auditLog.findMany({
            take: limit,
            orderBy: {
                timestamp: 'desc'
            }
        });
        return { success: true, data: logs };
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return { success: false, error: 'Failed to fetch audit logs' };
    }
}
