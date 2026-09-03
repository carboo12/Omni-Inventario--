import { getCashClosingReport } from "@/lib/actions/reports";
import CashClosingsClient from "./client";
import db from "@/lib/db";

export default async function CashClosingsPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string; cashierId?: string }>
}) {
    const params = await searchParams;
    const startDate = params.from ? new Date(params.from) : undefined;
    const endDate = params.to ? new Date(params.to) : undefined;
    const cashierId = params.cashierId;

    const data = await getCashClosingReport(startDate, endDate, cashierId);

    // Fetch users for the filter dropdown
    const users = await db.user.findMany({
        where: {
            role: { in: ['cashier', 'dispatcher', 'admin', 'master-admin'] }
        },
        select: {
            id: true,
            name: true
        }
    });

    return (
        <CashClosingsClient
            initialData={data}
            users={users}
        />
    );
}
