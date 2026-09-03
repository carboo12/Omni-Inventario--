'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useQuery } from '@tanstack/react-query';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { JewelryPOS } from '@/components/jewelry/jewelry-pos';
import { getAvailableJewelry } from '@/lib/actions/jewelry-production';
import { Loader2 } from 'lucide-react';

export function JewelrySalesClient() {
  const { mode } = useBusinessMode();
  const router = useRouter();

  useEffect(() => {
    if (mode && mode !== 'JEWELRY') router.replace('/dashboard');
  }, [mode, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['jewelry-sales', 'available'],
    queryFn: () => getAvailableJewelry().then((r) => (r.success ? (r.data as any[]) : [])),
    enabled: mode === 'JEWELRY',
  });

  if (mode && mode !== 'JEWELRY') return null;
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden">
      <JewelryPOS availablePieces={data || []} />
    </div>
  );
}