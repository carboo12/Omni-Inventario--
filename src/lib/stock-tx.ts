import db from './db';
import { Prisma } from '@prisma/client';

/** Número de intentos ante conflictos de escritura (carreras de stock). */
const STOCK_TX_MAX_ATTEMPTS = 3;

/**
 * Ejecuta una transacción de stock con aislamiento SERIALIZABLE y reintenta ante
 * conflictos de escritura (Prisma P2034). Esto hace que la comprobación de
 * existencias y el descuento FIFO sean atómicos: dos cajeros cobrando el mismo
 * producto a la vez no pueden ambos pasar la validación y dejar el stock en
 * negativo. Con el aislamiento por defecto (REPEATABLE READ) la lectura previa
 * al descuento no está protegida contra esas carreras.
 *
 * Se comparte entre la venta (`createSale`) y la liquidación de ruta para que
 * una devolución también reponga stock de forma atómica.
 */
export async function runStockSafeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= STOCK_TX_MAX_ATTEMPTS; attempt++) {
        try {
            return await db.$transaction(fn, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 15000,
            });
        } catch (error: any) {
            lastError = error;
            // P2034: transacción en conflicto o deadlock. Se reintenta con backoff.
            if (error?.code !== 'P2034' || attempt === STOCK_TX_MAX_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        }
    }
    throw lastError;
}
