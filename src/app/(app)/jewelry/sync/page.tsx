import { CsvSyncPanel } from "@/components/jewelry/csv-sync-panel";
import { BusinessGuard } from "@/lib/business-guard";
import { redirect } from '@/lib/router-nav';

export default async function JewelrySyncPage() {
    const mode = await BusinessGuard.getCurrentMode();
    if (mode !== 'JEWELRY') redirect('/dashboard');

    return (
        <div className="container mx-auto p-6 space-y-6">
            <CsvSyncPanel />
        </div>
    );
}
