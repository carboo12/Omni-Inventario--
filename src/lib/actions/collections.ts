'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';

export async function getCollections() {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Sesión no autorizada' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const payments = await db.collectionPayment.findMany({
      orderBy: { receivedAt: 'desc' },
      include: {
        order: {
          include: { customer: { select: { fullName: true } } },
        },
        user: { select: { name: true } },
      },
    });
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error fetching collections:', error);
    return { success: false, error: 'No se pudieron obtener los cobros' };
  }
}

export async function registerPayment(data: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Sesión no autorizada' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    // Registro de cobro, lectura y actualización del pedido en UNA transacción
    // para que no queden pagos sin reflejar o desplazamientos inconsistentes.
    const payment = await db.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id: data.orderId } });
      if (!order) throw new Error('Pedido no encontrado');

      const newPaid = Math.round((order.paidAmount + data.amount) * 100) / 100;
      const newStatus = newPaid >= order.totalAmount ? 'DELIVERED' : order.status;

      const created = await tx.collectionPayment.create({
        data: {
          id: generateUUID(),
          orderId: data.orderId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          userId: session.userId,
          notes: data.notes,
        },
      });

      await tx.customerOrder.update({
        where: { id: data.orderId },
        data: { paidAmount: newPaid, status: newStatus as any },
      });

      return created;
    });

    revalidatePath('/collections');
    revalidatePath(`/orders/${data.orderId}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error registering payment:', error);
    if (error instanceof Error && error.message === 'Pedido no encontrado') {
      return { success: false, error: 'El pedido no fue encontrado' };
    }
    return { success: false, error: 'No se pudo registrar el cobro' };
  }
}
