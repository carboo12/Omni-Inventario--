'use server';
import { generateUUID } from '@/lib/uuid';

import db from '@/lib/db';
import { verifySession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

interface CreateHeldSaleInput {
  dispatcherId: string;
  dispatcherName: string;
  customerName?: string;
  items: unknown;
  total: number;
  orderId?: string;
}

interface CreateHeldOrderInput {
  dispatcherId: string;
  dispatcherName: string;
  customerName?: string;
  items: unknown;
  total: number;
}

export async function createHeldSale(data: CreateHeldSaleInput) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: data.dispatcherId,
        dispatcherName: data.dispatcherName,
        customerName: data.customerName ?? null,
        items: data.items as any,
        total: data.total,
        status: 'PENDING',
        orderId: data.orderId ?? null,
      },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error creating held sale:', error);
    return { success: false, error: 'Failed to create held sale' };
  }
}

/**
 * Guarda temporalmente un pedido "En Espera" (borrador del despachador) sin
 * afectar caja ni stock. Se persiste como HeldSale con estado HELD, que la
 * caja no lee (solo lee PENDING), por lo que no interfiere con el cuadre.
 */
export async function createHeldOrder(data: CreateHeldOrderInput) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: data.dispatcherId,
        dispatcherName: data.dispatcherName,
        customerName: data.customerName ?? null,
        items: data.items as any,
        total: data.total,
        status: 'HELD',
        orderId: null,
      },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error creating held order:', error);
    return { success: false, error: 'Failed to create held order' };
  }
}

/** Lista los pedidos "En Espera" (borradores del despachador) pendientes de retomar. */
export async function getHeldOrders() {
  const session = await verifySession();
  if (!session) return { success: false, data: [] };

  try {
    const sales = await db.heldSale.findMany({
      where: { status: 'HELD' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: sales };
  } catch (error) {
    console.error('Error fetching held orders:', error);
    return { success: false, error: 'Failed to fetch held orders' };
  }
}

/**
 * Mueve un pedido "En Espera" (HELD) a la cola de caja (PENDING) cuando el
 * despachador lo termina y lo comanda. No afecta stock ni caja hasta cobrarse.
 */
export async function promoteHeldOrder(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const existing = await db.heldSale.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return { success: false, error: 'Pedido no encontrado' };
    if (existing.status !== 'HELD') return { success: false, error: 'El pedido ya no está en espera' };

    const sale = await db.heldSale.update({
      where: { id },
      data: { status: 'PENDING', lockedBy: null },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error promoting held order:', error);
    return { success: false, error: 'Failed to promote held order' };
  }
}

export async function getPendingHeldSales() {
  const session = await verifySession();
  if (!session) return { success: false, data: [] };

  try {
    const sales = await db.heldSale.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: sales };
  } catch (error) {
    console.error('Error fetching held sales:', error);
    return { success: false, error: 'Failed to fetch held sales' };
  }
}

export async function completeHeldSale(id: string, invoiceId?: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.update({
      where: { id },
      data: {
        status: 'BILLED',
        invoiceId: invoiceId ?? null,
      },
    });

    // Si la comanda proviene de un pedido ("Cargar en POS"), marcar el pedido
    // original como FACTURADO. updateMany + condición no-FACTURADO evita que un
    // cobro duplicado vuelva a marcar un pedido ya facturado.
    if (sale.orderId) {
      await db.customerOrder.updateMany({
        where: { id: sale.orderId, status: { not: 'FACTURADO' as any } },
        data: { status: 'FACTURADO' as any },
      });
      revalidatePath(`/orders/${sale.orderId}`);
    }

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error completing held sale:', error);
    return { success: false, error: 'Failed to complete held sale' };
  }
}

export async function cancelHeldSale(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.update({
      where: { id },
      data: { status: 'CANCELLED', lockedBy: null },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error cancelling held sale:', error);
    return { success: false, error: 'Failed to cancel held sale' };
  }
}

export async function updateHeldSale(id: string, items: unknown, total: number) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.update({
      where: { id },
      data: { items: items as any, total },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error updating held sale:', error);
    return { success: false, error: 'Failed to update held sale' };
  }
}

export async function lockHeldSale(id: string, userId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const existing = await db.heldSale.findUnique({ where: { id }, select: { lockedBy: true, status: true } });
    if (!existing) return { success: false, error: 'Comanda no encontrada' };
    if (existing.status !== 'PENDING') return { success: false, error: 'La comanda ya no está disponible' };
    if (existing.lockedBy && existing.lockedBy !== userId) {
      return { success: false, error: 'La comanda está siendo atendida por otro cajero' };
    }

    const sale = await db.heldSale.update({
      where: { id },
      data: { lockedBy: userId },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error locking held sale:', error);
    return { success: false, error: 'Failed to lock held sale' };
  }
}

export async function deleteHeldSale(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    await db.heldSale.delete({ where: { id } });
    revalidatePath('/pos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting held sale:', error);
    return { success: false, error: 'Failed to delete held sale' };
  }
}

export async function unlockHeldSale(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const sale = await db.heldSale.update({
      where: { id },
      data: { lockedBy: null },
    });

    revalidatePath('/pos');
    return { success: true, data: sale };
  } catch (error) {
    console.error('Error unlocking held sale:', error);
    return { success: false, error: 'Failed to unlock held sale' };
  }
}