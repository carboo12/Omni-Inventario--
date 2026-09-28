"use server";
import { generateUUID } from '@/lib/uuid';

import db from "@/lib/db";
import { Customer } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { recordAudit } from "./audit";
import { verifySession } from "@/lib/session";
import { getPaymentBucket } from "@/lib/payment-method";

const isAdminRole = (role?: string) => role === "admin" || role === "master-admin";

export async function createOrUpdateCustomer(data: {
    fullName: string;
    documentId?: string | null;
    phone?: string | null;
    address?: string | null;
    hasCredit?: boolean;
    creditLimit?: number;
    interestRate?: number;
    /**
     * Plazo de crédito propio del cliente (días). `null` = usar el ajuste global
     * de SystemSettings.defaultCreditDays. Si se omite en una actualización, se
     * conserva el valor ya guardado en la base de datos.
     */
    creditDays?: number | null;
    priceLevel?: number;
}) {
    const trimmedName = data.fullName.trim();
    if (!trimmedName) throw new Error("Nombre requerido");

    // SEGURIDAD DE CRÉDITO: solo el Administrador puede asignar/habilitar crédito.
    // Para cualquier otro rol, se ignoran los valores de crédito enviados y se fuerzan a deshabilitado.
    const session = await verifySession();
    const isAdmin = isAdminRole(session?.role);
    if (!isAdmin) {
        data.hasCredit = false;
        data.creditLimit = 0;
        data.creditDays = null;
    }

    // El plazo de crédito se normaliza a entero positivo o null (null = ajuste global).
    // `undefined` significa "no enviado": en una actualización se preserva el valor actual.
    const hasCreditDaysKey = Object.prototype.hasOwnProperty.call(data, 'creditDays');
    if (hasCreditDaysKey) {
        const days = Number(data.creditDays);
        data.creditDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : null;
    } else {
        delete data.creditDays;
    }

    // Check if customer exists by name or document
    let existing = await db.customer.findFirst({
        where: {
            OR: [
                { fullName: trimmedName },
                data.documentId ? { documentId: data.documentId } : undefined
            ].filter(Boolean) as any
        }
    });

    if (existing) {
        const updated = await db.customer.update({
            where: { id: existing.id },
            data: {
                ...data,
                fullName: trimmedName
            }
        });

        // AUDIT
        await recordAudit({
            userId: "SYSTEM_OR_CURRENT", // Ideally passed from UI
            userName: "Administrator",
            action: "UPDATE",
            entity: "Customer",
            entityId: updated.id,
            description: `Actualizó datos del cliente: ${updated.fullName}`,
            metadata: { old: existing, new: updated }
        });

        revalidatePath('/customers');
        return updated;
    } else {
        const created = await db.customer.create({
            data: {
                ...data,
                id: generateUUID(),
                fullName: trimmedName
            } as any
        });

        // AUDIT
        await recordAudit({
            userId: "SYSTEM_OR_CURRENT",
            userName: "Administrator",
            action: "CREATE",
            entity: "Customer",
            entityId: created.id,
            description: `Creó nuevo cliente: ${created.fullName}`,
            metadata: { new: created }
        });

        revalidatePath('/customers');
        return created;
    }
}

export async function searchOrCreateCustomer(fullName: string, documentId?: string, phone?: string): Promise<Customer> {
    if (!fullName || fullName.trim() === '') {
        throw new Error("Customer name is required");
    }

    const trimmedName = fullName.trim();

    // Buscar si existe un cliente con ese nombre o documento
    let query: any = {};
    if (documentId) {
        query = { documentId };
    } else {
        query = { fullName: trimmedName };
    }

    let customer = await db.customer.findFirst({
        where: query
    });

    if (!customer) {
        customer = await db.customer.create({
            data: {
                id: generateUUID(),
                fullName: trimmedName,
                documentId: documentId || null,
                phone: phone || null,
                // Habilitar crédito por defecto para no bloquear ventas a crédito
                // de clientes creados rápidamente desde el POS.
                hasCredit: true,
                creditLimit: 0,
            } as any
        });
    }

    return customer;
}

export async function updateCustomerCredit(id: string, data: { hasCredit: boolean, creditLimit: number, interestRate?: number, creditDays?: number | null }) {
    try {
        // SEGURIDAD: solo Administrador puede habilitar crédito o modificar límites.
        const session = await verifySession();
        if (!session || !isAdminRole(session.role)) {
            return { success: false, error: 'No autorizado. Solo el Administrador puede modificar la configuración de crédito.' };
        }

        // Plazo propio del cliente: entero positivo o null (null = ajuste global).
        // Si no se envía el campo, se conserva el valor actual.
        const hasCreditDaysKey = Object.prototype.hasOwnProperty.call(data, 'creditDays');
        const days = Number(data.creditDays);
        const normalizedDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : null;

        const customer = await db.customer.update({
            where: { id },
            data: {
                hasCredit: data.hasCredit,
                creditLimit: Number(data.creditLimit) || 0,
                ...(typeof data.interestRate === 'number' ? { interestRate: data.interestRate } : {}),
                ...(hasCreditDaysKey ? { creditDays: normalizedDays } : {}),
            }
        });

        // AUDIT
        await recordAudit({
            userId: session.id,
            userName: session.name,
            action: "UPDATE",
            entity: "Customer",
            entityId: customer.id,
            description: `Modificó la configuración de crédito del cliente ${customer.fullName} (habilitado: ${customer.hasCredit}, límite: C$ ${customer.creditLimit})`,
            metadata: { hasCredit: customer.hasCredit, creditLimit: customer.creditLimit }
        });

        revalidatePath('/customers/credit');
        revalidatePath('/customers');
        return { success: true, data: customer };
    } catch (error) {
        console.error('Error updating customer credit:', error);
        return { success: false, error: 'No se pudo actualizar la configuración de crédito' };
    }
}

export async function getCustomerStatement(id: string) {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: 'No autorizado' };

        const customer = await db.customer.findUnique({
            where: { id },
            include: {
                salesInvoice: {
                    orderBy: { date: 'desc' },
                    where: { paymentMethod: 'Credito' }
                },
                creditPayment: {
                    orderBy: { timestamp: 'desc' },
                    include: { salesInvoice: { select: { invoiceNumber: true } } }
                },
                creditInstallment: {
                    orderBy: { dueDate: 'asc' }
                }
            }
        });
        if (!customer) return { success: false, error: 'Cliente no encontrado' };

        // Normaliza la forma a lo que consumen las UIs (sales / creditPayments).
        const { salesInvoice, creditPayment, creditInstallment, ...rest } = customer;
        return {
            success: true,
            data: {
                ...rest,
                sales: salesInvoice,
                creditPayments: creditPayment,
                installments: creditInstallment,
            }
        };
    } catch (error) {
        console.error('Error fetching customer statement:', error);
        return { success: false, error: 'No se pudo obtener el estado de cuenta' };
    }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Aplica un abono de crédito FIFO: primero a las cuotas más antiguas (PENDING/
 * OVERDUE) de todas las facturas del cliente y luego a los saldos pendientes de
 * las facturas más antiguas. Reduce `SalesInvoice.pendingBalance` por factura y
 * marca las cuotas como PAID cuando quedan cubiertas.
 *
 * Devuelve los trozos por factura para crear un CreditPayment por cada uno.
 */
async function applyPaymentToInvoices(tx: any, customerId: string, amount: number): Promise<{ invoiceId: string | null; amount: number }[]> {
    const invoices = await tx.salesInvoice.findMany({
        where: { customerId, status: 'COMPLETED', pendingBalance: { gt: 0.005 } },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        select: { id: true, pendingBalance: true },
    });
    const installments = await tx.creditInstallment.findMany({
        where: { customerId, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        include: { salesInvoice: { select: { id: true } } },
    });

    const remainingByInvoice: Record<string, number> = {};
    for (const inv of invoices) remainingByInvoice[inv.id] = round2(Number(inv.pendingBalance) || 0);

    const chunks: { invoiceId: string | null; amount: number }[] = [];
    let remaining = round2(amount);

    const takeFromInvoice = async (invoiceId: string, take: number): Promise<number> => {
        const bal = remainingByInvoice[invoiceId] ?? 0;
        if (bal <= 0.005 || take <= 0.005) return 0;
        const applied = Math.min(bal, take);
        await tx.salesInvoice.update({
            where: { id: invoiceId },
            data: { pendingBalance: { decrement: applied } },
        });
        remainingByInvoice[invoiceId] = round2(bal - applied);
        return round2(applied);
    };

    // Pasada 1: cuotas más antiguas (FIFO). Marca PAID solo si quedan cubiertas.
    for (const inst of installments) {
        if (remaining <= 0.005) break;
        const applied = await takeFromInvoice(inst.saleId, Math.min(Number(inst.amount) || 0, remaining));
        if (applied <= 0.005) continue;
        if (applied >= (Number(inst.amount) || 0) - 0.005) {
            await tx.creditInstallment.update({ where: { id: inst.id }, data: { status: 'PAID' } });
        }
        chunks.push({ invoiceId: inst.saleId, amount: applied });
        remaining = round2(remaining - applied);
    }

    // Pasada 2: saldos pendientes de las facturas (FIFO por fecha).
    for (const inv of invoices) {
        if (remaining <= 0.005) break;
        const bal = remainingByInvoice[inv.id] ?? 0;
        if (bal <= 0.005) continue;
        const applied = round2(Math.min(bal, remaining));
        await tx.salesInvoice.update({
            where: { id: inv.id },
            data: { pendingBalance: { decrement: applied } },
        });
        remainingByInvoice[inv.id] = round2(bal - applied);
        chunks.push({ invoiceId: inv.id, amount: applied });
        remaining = round2(remaining - applied);
    }

    // Residuo sin factura asociada (saldo histórico sin pendingBalance).
    if (remaining > 0.005) {
        chunks.push({ invoiceId: null, amount: remaining });
    }

    return chunks;
}

export async function recordCreditPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod: string;
    sessionId: string;
    userId: string;
    notes?: string;
}) {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: 'No autorizado' };

        const amount = round2(Number(data.amount));
        if (!amount || amount <= 0) return { success: false, error: 'Monto inválido' };

        const result = await db.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
            if (!customer) throw new Error('Cliente no encontrado');

            // Protección server-side contra sobrepago (redondeo de 2 decimales).
            if (amount > round2(Number(customer.currentBalance) || 0) + 0.005) {
                throw new Error(`El monto excede el saldo pendiente del cliente (C$ ${Number(customer.currentBalance).toFixed(2)}).`);
            }

            const chunks = await applyPaymentToInvoices(tx, data.customerId, amount);

            // 1. Crear registros de pago (un abono por factura a la que se aplica).
            const paymentRows: any[] = [];
            for (const chunk of chunks) {
                if (chunk.amount <= 0.005) continue;
                const payment = await tx.creditPayment.create({
                    data: {
                        id: generateUUID(),
                        customerId: data.customerId,
                        invoiceId: chunk.invoiceId,
                        amount: chunk.amount,
                        paymentMethod: data.paymentMethod,
                        userId: data.userId,
                        notes: data.notes
                    } as any
                });
                paymentRows.push(payment);
            }

            // 2. Actualizar saldo del cliente.
            await tx.customer.update({
                where: { id: data.customerId },
                data: { currentBalance: { decrement: amount } }
            });

            // 3. Actualizar caja por método de pago: tarjeta/transferencia NO entra
            //    al efectivo esperado (se cuenta en salesAbonosCard).
            const bucket = getPaymentBucket(data.paymentMethod);
            const sessionUpdate = bucket === 'card'
                ? { salesAbonosCard: { increment: amount } }
                : { salesAbonos: { increment: amount } };
            await tx.cashRegisterSession.update({
                where: { id: data.sessionId },
                data: sessionUpdate
            });

            // 4. AUDIT
            await recordAudit({
                userId: session.id,
                userName: session.name,
                action: "CREDIT_PAYMENT",
                entity: "Customer",
                entityId: data.customerId,
                description: `Recibió abono de C$ ${amount.toFixed(2)} del cliente ${customer.fullName} (${data.paymentMethod})`,
                metadata: { amount, paymentMethod: data.paymentMethod, invoices: chunks.map(c => c.invoiceId) }
            });

            return { payment: paymentRows[0] || null, total: amount };
        });

        revalidatePath('/customers/credit');
        revalidatePath('/customers');
        revalidatePath('/cash-count');
        revalidatePath('/pos');
        return { success: true, data: result };
    } catch (error) {
        console.error('Error recording credit payment:', error);
        return { success: false, error: error instanceof Error ? error.message : 'No se pudo registrar el abono' };
    }
}
export async function deleteCustomer(id: string, userId: string, userName: string) {
    try {
        const customer = await db.customer.findUnique({ where: { id } });
        if (!customer) throw new Error("Cliente no encontrado");

        await db.customer.delete({ where: { id } });

        // AUDIT
        await recordAudit({
            userId,
            userName,
            action: "DELETE",
            entity: "Customer",
            entityId: id,
            description: `Eliminó al cliente: ${customer.fullName}`,
            metadata: { deleted: customer }
        });

        revalidatePath('/customers');
        return { success: true };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: 'No se puede eliminar el cliente (puede tener facturas asociadas)' };
    }
}

export async function getCustomerByFullName(fullName: string) {
    if (!fullName) return null;
    return await db.customer.findFirst({
        where: { fullName: fullName.trim() }
    });
}

export async function getAllCustomers(): Promise<Customer[]> {
    return db.customer.findMany({
        orderBy: { fullName: "asc" }
    });
}
