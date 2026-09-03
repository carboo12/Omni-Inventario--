'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useQuery } from '@tanstack/react-query';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { useCashRegisterSessions } from '@/hooks/use-cash-register-sessions';
import DailyClosingClient from './daily-closing-client';
import { getTodayJewelrySalesDetail, getJewelrySessionSummary } from '@/lib/actions/jewelry-reports';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from '@/lib/router-nav';

export function JewelryDailyClosingClient() {
  const { mode } = useBusinessMode();
  const { sessions } = useCashRegisterSessions();
  const router = useRouter();

  useEffect(() => {
    if (mode && mode !== 'JEWELRY') router.replace('/dashboard');
  }, [mode, router]);

  if (mode && mode !== 'JEWELRY') return null;

  const activeSession = sessions.find((s) => s.status === 'open');

  const { data, isLoading } = useQuery({
    queryKey: ['jewelry-daily-closing', activeSession?.id ?? 'none'],
    queryFn: async () => {
      if (!activeSession) return null;
      const [salesResult, summaryResult] = await Promise.all([
        getTodayJewelrySalesDetail(activeSession.id),
        getJewelrySessionSummary(activeSession.id),
      ]);
      if (!salesResult.success || !summaryResult.success) {
        throw new Error('Error al cargar los datos del reporte.');
      }
      return {
        sales: (salesResult.data as any[]) || [],
        summary: (summaryResult.data as any) || {},
        sessionId: activeSession.id,
      };
    },
    enabled: mode === 'JEWELRY' && !!activeSession,
  });

  if (!activeSession) {
    return (
      <div className="container mx-auto p-12">
        <Alert className="max-w-2xl mx-auto border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-bold">Sin Caja Abierta</AlertTitle>
          <AlertDescription className="text-yellow-700 mt-2">
            No hay ninguna sesión de caja abierta en este momento. Para ver el cierre del día,
            primero debe registrar alguna actividad o abrir una caja.
          </AlertDescription>
          <div className="mt-4 flex gap-3">
            <Button asChild className="bg-[#8BC34A] hover:bg-[#7CB342] text-white">
              <Link href="/cash-register/open">Abrir Caja</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/jewelry/sales">Ir a Ventas</Link>
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DailyClosingClient
        sales={data.sales as any}
        summary={data.summary as any}
        sessionId={data.sessionId}
      />
    </div>
  );
}