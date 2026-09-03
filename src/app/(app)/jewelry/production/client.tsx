'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useQuery } from '@tanstack/react-query';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { JewelryProductionForm } from '@/components/jewelry/jewelry-production-form';
import { getGoldStock } from '@/lib/actions/jewelry-production';
import { Loader2 } from 'lucide-react';

export function JewelryProductionClient() {
  const { mode } = useBusinessMode();
  const router = useRouter();

  useEffect(() => {
    if (mode && mode !== 'JEWELRY') router.replace('/dashboard');
  }, [mode, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['jewelry-production', 'stock'],
    queryFn: () => getGoldStock().then((r) => (r.success ? (r.data as any[]) : [])),
    enabled: mode === 'JEWELRY',
  });

  if (mode && mode !== 'JEWELRY') return null;
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-gray-900">Producción de Joyas</h1>
        <p className="text-muted-foreground">Transforme su materia prima (oro en stock) en piezas terminadas.</p>
      </div>
      <JewelryProductionForm initialStock={(data || []) as any} />
    </div>
  );
}