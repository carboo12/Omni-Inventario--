'use server'
import db from '../db';
import { verifySession } from '../session';

const isAdminRole = (role?: string) => role === 'admin' || role === 'master-admin';

export async function getOverdueInstallments() {
    const session = await verifySession();
    if (!session || !isAdminRole(session.role)) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Morosidad: cuota PENDING con fecha de vencimiento anterior a hoy.
        const installments = await db.creditInstallment.findMany({
            where: {
                status: 'PENDING',
                dueDate: { lt: new Date() }
            },
            orderBy: { dueDate: 'asc' },
            include: {
                customer: { select: { fullName: true, phone: true } },
                salesInvoice: { select: { invoiceNumber: true } }
            }
        });

        return { success: true, data: installments };
    } catch (error) {
        console.error('Error fetching overdue installments:', error);
        return { success: false, error: 'Failed to fetch overdue installments' };
    }
}