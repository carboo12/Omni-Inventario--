import { getGoldStock } from "@/lib/actions/jewelry-production";
import { JewelryProductionForm } from "@/components/jewelry/jewelry-production-form";
import { BusinessGuard } from "@/lib/business-guard";
import { redirect } from '@/lib/router-nav';

export default async function ProductionPage() {
    const mode = await BusinessGuard.getCurrentMode();
    if (mode !== 'JEWELRY') redirect('/dashboard');

    const stockResult = await getGoldStock();
    const stock = stockResult.success ? (stockResult.data as any[]) : [];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-gray-900">Producción de Joyas</h1>
                <p className="text-muted-foreground">Transforme su materia prima (oro en stock) en piezas terminadas.</p>
            </div>

            <JewelryProductionForm initialStock={stock} />
        </div>
    );
}
