'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { CsvSyncPanel } from '@/components/jewelry/csv-sync-panel';

export function JewelrySyncClient() {
  const { mode } = useBusinessMode();
  const router = useRouter();

  useEffect(() => {
    if (mode && mode !== 'JEWELRY') router.replace('/dashboard');
  }, [mode, router]);

  if (mode && mode !== 'JEWELRY') return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <CsvSyncPanel />
    </div>
  );
}