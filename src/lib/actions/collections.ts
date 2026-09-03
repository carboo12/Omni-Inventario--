'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';

export async function getCollections() {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
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
    return { success: false, error: 'Failed to fetch collections' };
  }
}

export async function registerPayment(data: {
  orderId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const payment = await db.collectionPayment.create({
      data: {
        id: generateUUID(),
        orderId: data.orderId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        userId: session.userId,
        notes: data.notes,
      },
    });

    const order = await db.customerOrder.findUnique({ where: { id: data.orderId } });
    if (order) {
      const newPaid = order.paidAmount + data.amount;
      const newStatus = newPaid >= order.totalAmount ? 'DELIVERED' : order.status;
      await db.customerOrder.update({
        where: { id: data.orderId },
        data: { paidAmount: newPaid, status: newStatus as any },
      });
    }

    revalidatePath('/collections');
    revalidatePath(`/orders/${data.orderId}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error registering payment:', error);
    return { success: false, error: 'Failed to register payment' };
  }
}
