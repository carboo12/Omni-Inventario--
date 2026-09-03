import { getSuppliers } from "@/lib/actions/suppliers";
import NewPurchaseClient from "./client";

export default async function NewPurchasePage() {
    const suppliersResult = await getSuppliers();
    const suppliers = suppliersResult.success ? suppliersResult.data : [];

    return <NewPurchaseClient initialSuppliers={suppliers || []} />;
}
