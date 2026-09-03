import { getAvailableJewelry } from "@/lib/actions/jewelry-production";
import { JewelryPOS } from "@/components/jewelry/jewelry-pos";
import { BusinessGuard } from "@/lib/business-guard";
import { redirect } from '@/lib/router-nav';

export default async function JewelrySalesPage() {
    const mode = await BusinessGuard.getCurrentMode();
    if (mode !== 'JEWELRY') redirect('/dashboard');

    const piecesResult = await getAvailableJewelry();
    const pieces = piecesResult.success ? (piecesResult.data as any[]) : [];

    return (
        <div className="h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden">
            <JewelryPOS availablePieces={pieces} />
        </div>
    );
}
