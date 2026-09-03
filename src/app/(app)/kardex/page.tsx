import { getInventoryMovements } from "@/lib/actions/kardex";
import KardexClient from "./client";
import { BusinessGuard } from "@/lib/business-guard";

export default async function KardexPage() {
    const result = await getInventoryMovements();
    const movements = result.success ? result.data : [];
    const businessMode = await BusinessGuard.getCurrentMode();

    return <KardexClient initialMovements={movements || []} businessMode={businessMode} />;
}
