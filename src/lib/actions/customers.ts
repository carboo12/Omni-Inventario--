"use server";
import { generateUUID } from '@/lib/uuid';

import db from "@/lib/db";
import { Customer } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { recordAudit } from "./audit";
import { verifySession } from "@/lib/session";

const isAdminRole = (role?: string) => role === "admin" || role === "master-admin";

export async function createOrUpdateCustomer(data: {
    fullName: string;
    documentId?: string | null;
    phone?: string | null;
    address?: string | null;
    hasCredit?: boolean;
    creditLimit?: number;
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

export async function updateCustomerCredit(id: string, data: { hasCredit: boolean, creditLimit: number }) {
    try {
        const customer = await db.customer.update({
            where: { id },
            data
        });
        revalidatePath('/customers/credit');
        return { success: true, data: customer };
    } catch (error) {
        console.error('Error updating customer credit:', error);
        return { success: false, error: 'Failed to update credit settings' };
    }
}

export async function getCustomerStatement(id: string) {
    try {
        const customer = await db.customer.findUnique({
            where: { id },
            include: {
                salesInvoice: {
                    orderBy: { date: 'desc' },
                    where: { paymentMethod: 'Credito' }
                },
                creditPayment: {
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
        return { success: true, data: customer };
    } catch (error) {
        console.error('Error fetching customer statement:', error);
        return { success: false, error: 'Failed to fetch statement' };
    }
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
        return await db.$transaction(async (tx) => {
            // 1. Create Payment Record
            const payment = await tx.creditPayment.create({
                data: {
                    id: generateUUID(),
                    customerId: data.customerId,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    userId: data.userId,
                    notes: data.notes
                } as any
            });

            // 2. Update Customer Balance
            await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    currentBalance: { decrement: data.amount }
                }
            });

            // 3. Update Session
            await tx.cashRegisterSession.update({
                where: { id: data.sessionId },
                data: {
                    salesAbonos: { increment: data.amount }
                }
            });

            // 4. AUDIT
            const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
            await recordAudit({
                userId: data.userId,
                userName: "Cajero", // We should get the real name if possible
                action: "CREDIT_PAYMENT",
                entity: "Customer",
                entityId: data.customerId,
                description: `Recibió abono de C$ ${data.amount} del cliente ${customer?.fullName}`,
                metadata: { amount: data.amount, paymentMethod: data.paymentMethod }
            });

            revalidatePath('/customers/credit');
            revalidatePath('/cash-count');
            return { success: true, data: payment };
        });
    } catch (error) {
        console.error('Error recording credit payment:', error);
        return { success: false, error: 'Failed to record payment' };
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
