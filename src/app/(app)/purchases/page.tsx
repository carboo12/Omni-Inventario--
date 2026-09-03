import { getPurchaseInvoices } from "@/lib/actions/purchases";
import { getSuppliers } from "@/lib/actions/suppliers";
import { getPurchaseOrders } from "@/lib/actions/purchase-orders";
import PurchasesClient from "./client";

export default async function PurchasesPage() {
    const [invoicesResult, suppliersResult, ordersResult] = await Promise.all([
        getPurchaseInvoices(),
        getSuppliers(),
        getPurchaseOrders(),
    ]);

    const invoices = invoicesResult.success ? invoicesResult.data : [];
    const suppliers = suppliersResult.success ? suppliersResult.data : [];
    const orders = ordersResult.success ? ordersResult.data : [];

    return <PurchasesClient
        initialInvoices={invoices || []}
        initialSuppliers={suppliers || []}
        initialOrders={orders || []}
    />;
}

