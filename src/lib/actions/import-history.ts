'use server'

import db from '../db';

/**
 * Obtiene el historial completo de importaciones
 */
export async function getImportHistory() {
    try {
        const history = await db.importHistory.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                importedAt: 'desc'
            }
        });

        return { success: true, data: history };
    } catch (error) {
        console.error('Error fetching import history:', error);
        return { success: false, error: 'Failed to fetch import history' };
    }
}

/**
 * Obtiene los detalles de una importación específica
 */
export async function getImportDetails(id: string) {
    try {
        const details = await db.importHistory.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        });

        if (!details) {
            return { success: false, error: 'Import not found' };
        }

        return { success: true, data: details };
    } catch (error) {
        console.error('Error fetching import details:', error);
        return { success: false, error: 'Failed to fetch import details' };
    }
}

/**
 * Crea un nuevo registro de historial de importación
 */
export async function createImportHistory(data: {
    fileName: string;
    importedBy: string;
    mode: string;
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    productsCreated: number;
    productsUpdated: number;
    inventoryItemsCreated: number;
    errors: string[];
    summary: any;
}) {
    try {
        const history = await db.importHistory.create({
            data: {
                fileName: data.fileName,
                importedBy: data.importedBy,
                mode: data.mode,
                totalRows: data.totalRows,
                successfulRows: data.successfulRows,
                failedRows: data.failedRows,
                productsCreated: data.productsCreated,
                productsUpdated: data.productsUpdated,
                inventoryItemsCreated: data.inventoryItemsCreated,
                errors: data.errors,
                summary: data.summary
            }
        });

        return { success: true, data: history };
    } catch (error) {
        console.error('Error creating import history:', error);
        return { success: false, error: 'Failed to create import history' };
    }
}
