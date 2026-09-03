'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { BusinessGuard } from '../business-guard';

export async function getDeliveryRoutes() {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const routes = await db.deliveryRoute.findMany({
      orderBy: { date: 'desc' },
      include: {
        rutero: { select: { name: true } },
        stops: {
          include: {
            customer: { select: { fullName: true } },
            order: { select: { orderNumber: true, totalAmount: true } },
          },
        },
      },
    });
    return { success: true, data: routes };
  } catch (error) {
    console.error('Error fetching routes:', error);
    return { success: false, error: 'Failed to fetch routes' };
  }
}

export async function getDeliveryRouteById(id: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const route = await db.deliveryRoute.findUnique({
      where: { id },
      include: {
        rutero: { select: { name: true } },
        stops: {
          orderBy: { id: 'asc' },
          include: {
            customer: { select: { fullName: true, phone: true, address: true } },
            order: { select: { orderNumber: true, totalAmount: true, paidAmount: true, status: true } },
          },
        },
      },
    });
    return { success: true, data: route };
  } catch (error) {
    console.error('Error fetching route:', error);
    return { success: false, error: 'Failed to fetch route' };
  }
}

export async function createDeliveryRoute(data: {
  name: string;
  ruteroId?: string;
  date: string;
  stops: { customerId: string; orderId?: string; address?: string; notes?: string }[];
}) {
  const session = await verifySession();
  if (!session || (session.role !== 'master-admin' && session.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const route = await db.deliveryRoute.create({
      data: {
        id: generateUUID(),
        name: data.name,
        ruteroId: data.ruteroId || null,
        date: new Date(data.date),
        stops: {
          create: data.stops.map((stop) => ({
            id: generateUUID(),
            customerId: stop.customerId,
            orderId: stop.orderId || null,
            address: stop.address || null,
            notes: stop.notes || null,
          })),
        },
      },
      include: {
        stops: true,
      },
    });

    revalidatePath('/delivery-routes');
    return { success: true, data: route };
  } catch (error) {
    console.error('Error creating route:', error);
    return { success: false, error: 'Failed to create route' };
  }
}

export async function updateRouteStatus(id: string, status: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const route = await db.deliveryRoute.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath('/delivery-routes');
    revalidatePath(`/delivery-routes/${id}`);
    return { success: true, data: route };
  } catch (error) {
    console.error('Error updating route status:', error);
    return { success: false, error: 'Failed to update route status' };
  }
}

export async function updateStopStatus(stopId: string, status: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };
  await BusinessGuard.assertMode('DISTRIBUIDORA');

  try {
    const stop = await db.deliveryRouteStop.update({
      where: { id: stopId },
      data: {
        status: status as any,
        visitedAt: status === 'VISITED' ? new Date() : undefined,
      },
    });
    revalidatePath('/delivery-routes');
    return { success: true, data: stop };
  } catch (error) {
    console.error('Error updating stop status:', error);
    return { success: false, error: 'Failed to update stop status' };
  }
}

export async function getRuteros() {
  try {
    const ruteros = await db.user.findMany({
      where: { role: 'rutero', isEnabled: true },
      select: { id: true, name: true },
    });
    return { success: true, data: ruteros };
  } catch (error) {
    console.error('Error fetching ruteros:', error);
    return { success: false, error: 'Failed to fetch ruteros' };
  }
}
