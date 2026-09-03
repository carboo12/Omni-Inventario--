import { getAvailableJewelry } from "@/lib/actions/jewelry-production";
import { JewelryInventoryList } from "@/components/jewelry/jewelry-inventory-list";
import { Gem } from "lucide-react";
import Link from '@/lib/router-nav';
import { Button } from "@/components/ui/button";
import { verifySession } from "@/lib/session";
import { JewelryExportImport } from "@/components/jewelry/jewelry-export-import";
import { InventorySyncPanel } from "@/components/jewelry/inventory-sync-panel";
import db from "@/lib/db";
import { BusinessGuard } from "@/lib/business-guard";
import { redirect } from '@/lib/router-nav';

export default async function JewelryInventoryPage() {
    const businessMode = await BusinessGuard.getCurrentMode();
    if (businessMode !== 'JEWELRY') redirect('/dashboard');

    const session = await verifySession();
    const canManageInventory = session?.role === "master-admin" || session?.role === "admin";

    // Get current location mode
    const settings = await db.systemSettings.findFirst();
    const mode = settings?.jewelryLocationMode || "HOME";

    // In HOME mode, load ALL pieces (AVAILABLE + SOLD) so we can show sold ones in red
    // In STORE modes, only show AVAILABLE
    let pieces: any[] = [];
    if (mode === "HOME") {
        const result = await db.jewelryPiece.findMany({
            orderBy: { createdAt: "desc" },
        });
        pieces = result;
    } else {
        const piecesResult = await getAvailableJewelry();
        pieces = piecesResult.success ? (piecesResult.data as any[]) : [];
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-900">Inventario de Joyería</h1>
                    <p className="text-muted-foreground">Piezas terminadas listas para la venta o entrega.</p>
                </div>
                {canManageInventory && (
                    <Link href="/jewelry/production">
                        <Button className="bg-[#673AB7] hover:bg-[#5E35B1]">
                            <Gem className="mr-2 h-4 w-4" />
                            Nueva Producción
                        </Button>
                    </Link>
                )}
            </div>

            <div className="flex justify-end mt-2">
                <JewelryExportImport />
            </div>

            {/* Sync panel: only visible in HOME mode */}
            {mode === "HOME" && canManageInventory && (
                <InventorySyncPanel />
            )}

            <JewelryInventoryList pieces={pieces} />
        </div>
    );
}
