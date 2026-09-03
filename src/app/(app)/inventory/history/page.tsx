import { getInventoryMovements } from "@/lib/actions/inventory";
import InventoryHistoryClient from "./client";

export default async function InventoryHistoryPage() {
    const result = await getInventoryMovements();
    const movements = result.success ? result.data : [];

    return <InventoryHistoryClient movements={movements || []} />;
}
