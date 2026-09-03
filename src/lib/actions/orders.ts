'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';
import { getProducts } from './products';

export async function getOrders() {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const orders = await db.customerOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true } },
        user: { select: { name: true } },
        items: true,
        payments: true,
      },
    });
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { success: false, error: 'Failed to fetch orders' };
  }
}

export async function getOrderById(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const order = await db.customerOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { fullName: true, phone: true, address: true } },
        user: { select: { name: true } },
        items: true,
        payments: { include: { user: { select: { name: true } } } },
        routeStops: { include: { route: { select: { name: true } } } },
      },
    });
    return { success: true, data: order };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { success: false, error: 'Failed to fetch order' };
  }
}

export async function createOrder(data: {
  customerId: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
  notes?: string;
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const order = await db.customerOrder.create({
      data: {
        id: generateUUID(),
        customerId: data.customerId,
        userId: session.userId,
        totalAmount,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            id: generateUUID(),
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: { select: { fullName: true } },
        items: true,
      },
    });

    revalidatePath('/orders');
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Failed to create order' };
  }
}

export async function updateOrderStatus(id: string, status: string) {
  const session = await verifySession();
  if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const order = await db.customerOrder.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath('/orders');
    revalidatePath(`/orders/${id}`);
    return { success: true, data: order };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

/**
 * "Cargar en POS": agrega un pedido a la cola global de "Pedidos por Cobrar"
 * (HeldSale) marcando la referencia del pedido origen (orderId), para que
 * cualquier cajero lo vea y pueda facturarlo. Devuelve también los ítems de
 * carrito listos para precargar el POS del cajero actual.
 */
export async function queueOrderForPOS(orderId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const order = await db.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true } },
        items: true,
      },
    });
    if (!order) return { success: false, error: 'Pedido no encontrado' };
    if (order.status === 'FACTURADO') return { success: false, error: 'Este pedido ya fue facturado' };

    // Anti-duplicación en cola: si ya hay una comanda pendiente para este
    // pedido, se reutiliza en lugar de crear otra.
    const existing = await db.heldSale.findFirst({ where: { orderId, status: 'PENDING' as any } });
    if (existing) {
      revalidatePath('/pos');
      return { success: true, data: existing, cartItems: (existing.items as any) || [] };
    }

    const user = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const productsRes: any = await getProducts();
    const products: any[] = productsRes?.success ? (productsRes.data ?? []) : [];

    const cartItems = (order.items || []).map((it: any) => {
      const product = products.find((p: any) => p.id === it.productId)
        || products.find((p: any) => p.name === it.productName);
      if (!product) return null;
      return {
        id: generateUUID(),
        product,
        quantity: Math.max(1, it.quantity || 1),
        unitPrice: Number(it.unitPrice) || 0,
        presentation: 'unit',
        isEncargo: false,
      };
    }).filter(Boolean);

    const sale = await db.heldSale.create({
      data: {
        id: generateUUID(),
        dispatcherId: session.userId,
        dispatcherName: user?.name || session.userId,
        customerName: order.customer?.fullName ?? 'Cliente General',
        items: cartItems as any,
        total: order.totalAmount,
        status: 'PENDING',
        orderId: orderId,
      },
    });

    revalidatePath('/pos');
    return { success: true, data: sale, cartItems };
  } catch (error) {
    console.error('Error queueing order for POS:', error);
    return { success: false, error: 'Failed to queue order for POS' };
  }
}
