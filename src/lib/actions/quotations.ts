'use server'
import { generateUUID } from '@/lib/uuid';

import db from '../db';
import { revalidatePath } from 'next/cache';
import { verifySession } from '../session';
import { getPaymentBucket, isCreditPayment } from '../payment-method';

export async function createQuote(data: {
  customerName?: string;
  customerPhone?: string;
  expirationDays?: number;
  notes?: string;
  clientId?: string;
  items: { productId?: string; productName: string; quantity: number; unitPrice: number; variantId?: string; priceLevel?: number }[];
  total: number;
}) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Sin sesión activa. Inicie sesión nuevamente.' };

  try {
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) {
      return { success: false, error: 'La cotización debe tener al menos un producto.' };
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = Number.isFinite(data.total) && data.total > 0 ? data.total : subtotal;
    const userId = (session as any).userId ?? null;

    // quoteNumber es autoincremental en BD (COT-0000001, COT-0000002, ...);
    // el registro se persiste junto con sus ítems en la misma transacción.
    const quote = await db.quote.create({
      data: {
        id: generateUUID(),
        customerName: data.customerName || 'Cliente General',
        customerPhone: data.customerPhone || null,
        expirationDays: data.expirationDays || 30,
        subtotal,
        tax: 0,
        total,
        status: 'PENDING',
        notes: data.notes || null,
        clientId: data.clientId || null,
        userId,
        items: {
          create: items.map(item => ({
            id: generateUUID(),
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            variantId: item.variantId || null,
            priceLevel: typeof item.priceLevel === 'number' ? item.priceLevel : 1,
          }))
        }
      },
      include: { items: true, customer: true, user: true }
    });

    revalidatePath('/quotations');
    return { success: true, data: quote };
  } catch (error) {
    console.error('Error creating quote:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al crear cotización' };
  }
}

export async function getQuotes(search?: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Sin sesión activa. Inicie sesión nuevamente.' };

  try {
    const where: any = {};
    if (search) {
      const term = search.trim();
      const searchNum = parseInt(term.replace(/^COT-/i, '').replace(/^0+/, ''), 10);
      if (Number.isFinite(searchNum) && searchNum > 0) {
        where.OR = [
          { quoteNumber: searchNum },
          { customerName: { contains: term } },
        ];
      } else {
        where.customerName = { contains: term };
      }
    }

    // Sin filtro por usuario: cualquier usuario autenticado de la sucursal
    // (incluido el rol Cashier) debe ver todas las cotizaciones emitidas en ella.
    // El modelo no tiene columna companyId porque la base es de una sola empresa;
    // el aislamiento se da por la base de datos/sucursal, no por el rol.
    const quotes = await db.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, user: true, customer: true }
    });

    // El estado PENDING es el que se guarda; la vigencia se deriva aquí para que
    // la tabla no muestre "Pendiente" una cotización que ya venció.
    const now = Date.now();
    const data = (quotes as any[]).map((q) => {
      const expiresAt = new Date(q.createdAt).getTime() + (q.expirationDays || 30) * 86400000;
      const isExpired = expiresAt < now;
      return { ...q, expiresAt: new Date(expiresAt).toISOString(), status: q.status === 'PENDING' && isExpired ? 'EXPIRED' : q.status };
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return { success: false, error: 'Error al obtener cotizaciones' };
  }
}

export async function getPendingQuotes() {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const quotes = await db.quote.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { customer: true, user: true },
      take: 50,
    });

    // Solo cotizaciones aún vigentes (createdAt + expirationDays >= hoy).
    const now = new Date();
    const active = (quotes as any[]).filter((q) => {
      const expiresAt = new Date(q.createdAt);
      expiresAt.setDate(expiresAt.getDate() + (q.expirationDays || 30));
      return expiresAt >= now;
    });

    return { success: true, data: active };
  } catch (error) {
    console.error('Error fetching pending quotes:', error);
    return { success: false, error: 'Error al obtener cotizaciones pendientes' };
  }
}

export async function getQuoteByNumber(quoteNumber: number | string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    let parsed: number;
    if (typeof quoteNumber === 'string') {
      const cleaned = quoteNumber.replace(/^COT-/i, '').replace(/^0+/, '');
      parsed = cleaned === '' ? 1 : parseInt(cleaned, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { success: false, error: 'Número de cotización inválido' };
      }
    } else {
      parsed = quoteNumber;
    }

    const quote = await db.quote.findUnique({
      where: { quoteNumber: parsed },
      include: { items: true, user: true, customer: true }
    });

    if (!quote) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('Error fetching quote:', error);
    return { success: false, error: 'Error al buscar cotización' };
  }
}

export async function convertQuoteToInvoice(quoteId: string, sessionId: string, userId: string, inventoryType: string, paymentMethod: string, customerId?: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: { items: true }
    });

    if (!quote) {
      return { success: false, error: 'Cotización no encontrada' };
    }

    if (quote.status === 'CONVERTED') {
      return { success: false, error: 'Esta cotización ya fue convertida en factura' };
    }

    if (quote.status === 'CANCELLED') {
      return { success: false, error: 'Esta cotización fue cancelada' };
    }

    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let createdInvoiceNumber = 0;

    await db.$transaction(async (tx) => {
      const quoteItems = (quote as any).items || [];
      for (const item of quoteItems) {
        if (!item.productId) continue;

        const inventoryItems = await tx.inventoryItem.findMany({
          where: {
            productId: item.productId,
            inventoryType: inventoryType,
            quantity: { gt: 0 }
          },
          orderBy: { expiryDate: 'asc' }
        });

        let remainingToSell = item.quantity;

        for (const invItem of inventoryItems) {
          if (remainingToSell <= 0) break;
          const quantityToTake = Math.min(invItem.quantity, remainingToSell);

          const updatedInvItem = await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { quantity: { decrement: quantityToTake } }
          });

          if (updatedInvItem.quantity < 0) {
            throw new Error(`Stock insuficiente para: ${item.productName}`);
          }

          const newQuantity = updatedInvItem.quantity;
          const status = newQuantity <= 0 ? 'Agotado' : (newQuantity < 10 ? 'Stock Bajo' : 'En Stock');

          if (updatedInvItem.status !== status) {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { status }
            });
          }

          const currentStockRecords = await tx.inventoryItem.findMany({
            where: { productId: item.productId, inventoryType }
          });
          const currentTotal = currentStockRecords.reduce((sum, i) => sum + i.quantity, 0);
          const previousTotal = currentTotal + quantityToTake;

          await tx.inventoryMovement.create({
            data: {
              id: generateUUID(),
              timestamp: new Date().toISOString(),
              productName: item.productName,
              movementType: 'Salida',
              movementId: transactionId,
              quantityChange: -quantityToTake,
              previousQuantity: previousTotal,
              newQuantity: currentTotal,
              userId,
              inventoryType
            } as any
          });

          remainingToSell -= quantityToTake;
        }

        if (remainingToSell > 0) {
          throw new Error(`Stock insuficiente para: ${item.productName}`);
        }
      }

      const salesInvoice = await tx.salesInvoice.create({
        data: {
          id: generateUUID(),
          totalAmount: quote.total,
          paymentMethod,
          status: 'COMPLETED',
          sessionId,
          userId,
          customerId: customerId || null,
          salesInvoiceItem: {
            create: quoteItems.map((item: any) => ({
              id: generateUUID(),
              productId: item.productId || item.productName,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              variantId: item.variantId || null,
              priceLevel: typeof item.priceLevel === 'number' ? item.priceLevel : 1,
            }))
          }
        } as any
      });

      createdInvoiceNumber = salesInvoice.invoiceNumber;

      if (isCreditPayment(paymentMethod)) {
        if (!customerId) throw new Error('Cliente es requerido para venta al crédito');
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer || !customer.hasCredit) throw new Error('El cliente no tiene habilitado el crédito');

        const newBalance = customer.currentBalance + quote.total;
        if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
          throw new Error(`Límite de crédito excedido. Disponible: C$ ${(customer.creditLimit - customer.currentBalance).toFixed(2)}`);
        }

        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalance: { increment: quote.total } }
        });
      }

      const updateData: any = { totalSales: { increment: quote.total } };
      switch (getPaymentBucket(paymentMethod)) {
        case 'cash': updateData.salesCash = { increment: quote.total }; break;
        case 'card': updateData.salesCard = { increment: quote.total }; break;
        case 'usd': updateData.salesUSD = { increment: quote.total }; break;
        case 'credit': updateData.salesCredit = { increment: quote.total }; break;
        case 'other': break;
      }

      await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: updateData
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'CONVERTED', convertedInvoiceId: salesInvoice.id }
      });
    });

    revalidatePath('/pos');
    revalidatePath('/inventory');
    revalidatePath('/quotations');

    return { success: true, invoiceNumber: createdInvoiceNumber };
  } catch (error) {
    console.error('Error converting quote:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al convertir cotización' };
  }
}

export async function cancelQuote(quoteId: string) {
  const session = await verifySession();
  if (!session) return { success: false, error: 'Sin sesión activa. Inicie sesión nuevamente.' };

  try {
    const quote = await db.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return { success: false, error: 'Cotización no encontrada' };
    if (quote.status === 'CONVERTED') {
      return { success: false, error: 'No se puede anular una cotización ya facturada' };
    }
    if (quote.status === 'CANCELLED') {
      return { success: true, data: quote };
    }

    const updated = await db.quote.update({
      where: { id: quoteId },
      data: { status: 'CANCELLED' }
    });

    revalidatePath('/quotations');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error cancelling quote:', error);
    return { success: false, error: 'Error al anular cotización' };
  }
}
