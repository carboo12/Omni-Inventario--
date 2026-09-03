import { getSuppliers } from "@/lib/actions/suppliers";
import { getProducts } from "@/lib/actions/products";
import { Supplier, Product } from "@/lib/types";
import NewOrderClient from "./order-form";

export default async function NewOrderPage() {
    const [suppliersResult, productsResult] = await Promise.all([
        getSuppliers(),
        getProducts(),
    ]);
    const suppliers = suppliersResult.success ? (suppliersResult.data as unknown as Supplier[]) : [];
    const products = productsResult.success ? (productsResult.data as unknown as Product[]) : [];

    return <NewOrderClient suppliers={suppliers || []} products={products || []} />;
}
