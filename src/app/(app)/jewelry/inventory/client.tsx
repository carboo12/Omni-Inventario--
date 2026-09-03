'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useQuery } from '@tanstack/react-query';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { useAuth } from '@/hooks/use-auth';
import { JewelryInventoryList } from '@/components/jewelry/jewelry-inventory-list';
import { JewelryExportImport } from '@/components/jewelry/jewelry-export-import';
import { InventorySyncPanel } from '@/components/jewelry/inventory-sync-panel';
import { useSettings } from '@/hooks/use-settings';
import { getAvailableJewelry } from '@/lib/actions/jewelry-production';
import { Loader2 } from 'lucide-react';

export function JewelryInventoryClient() {
  const { mode } = useBusinessMode();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();

  const canManageInventory = user?.role === 'master-admin' || user?.role === 'admin';
  const jewelryMode = settings?.jewelryLocationMode || 'HOME';

  useEffect(() => {
    if (mode && mode !== 'JEWELRY') router.replace('/dashboard');
  }, [mode, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['jewelry-inventory', 'pieces'],
    queryFn: () => getAvailableJewelry().then((r) => (r.success ? (r.data as any[]) : [])),
    enabled: mode === 'JEWELRY',
  });

  if (mode && mode !== 'JEWELRY') return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-gray-900">Inventario de Joyería</h1>
          <p className="text-muted-foreground">Piezas terminadas listas para la venta o entrega.</p>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <JewelryExportImport />
      </div>

      {jewelryMode === 'HOME' && canManageInventory && <InventorySyncPanel />}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <JewelryInventoryList pieces={(data || []) as any} />
      )}
    </div>
  );
}