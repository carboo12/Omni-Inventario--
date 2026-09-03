import { getPurchaseOrderById } from "@/lib/actions/purchase-orders";
import { notFound } from '@/lib/router-nav';
import OrderDetailsClient from "./client";

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getPurchaseOrderById(id);

    if (!result.success || !result.data) {
        notFound();
    }

    return <OrderDetailsClient order={result.data} />;
}
