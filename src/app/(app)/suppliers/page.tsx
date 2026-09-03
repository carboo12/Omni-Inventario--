import { getSuppliers } from "@/lib/actions/suppliers";
import SuppliersClient from "./client";

export default async function SuppliersPage() {
    const result = await getSuppliers();
    const suppliers = result.success ? result.data : [];

    return <SuppliersClient initialSuppliers={suppliers || []} />;
}
