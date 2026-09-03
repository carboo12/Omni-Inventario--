'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useInitialData } from '@/hooks/use-initial-data';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from '@/lib/router-nav';
import { usePathname } from '@/lib/router-nav';

export function CashRegisterAlert() {
  const { data: initialData, loading } = useInitialData();
  const { user } = useAuth();
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show on POS or specific cash register pages to avoid clutter
  const isPosPage = pathname === '/pos';
  const isCashRegisterPage = pathname.includes('/cash-register');

  const openSession = useMemo(() => {
    if (!initialData?.sessions || loading) return null;

    let session = null;
    if (user?.role === 'cashier') {
      // For cashiers, only show their own open session
      session = initialData.sessions.find(s => s.status === 'open' && s.cashierId === user.id);
    } else if (user?.role === 'admin' || user?.role === 'master-admin') {
      // For admins, show the first open session found
      session = initialData.sessions.find(s => s.status === 'open');
    }

    if (!session) return null;

    // Trigger the alert if the timestamp exceeds 1 day (24 hours) since the box was opened
    const openingDate = new Date(session.openingTime);
    const now = new Date();
    const diffInHours = (now.getTime() - openingDate.getTime()) / (1000 * 60 * 60);

    return diffInHours >= 24 ? session : null;
  }, [initialData, user, loading]);

  // Check persistent dismissal state
  useEffect(() => {
    if (openSession) {
      const dismissed = localStorage.getItem(`dismissed-cash-alert-${openSession.id}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [openSession]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (openSession) {
      localStorage.setItem(`dismissed-cash-alert-${openSession.id}`, 'true');
    }
  };

  if (isDismissed || !openSession || isPosPage || isCashRegisterPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Alert variant="destructive" className="relative border-2 shadow-2xl bg-white/95 backdrop-blur-sm pr-12 pb-4 border-red-500">
        {/* Botón de Cerrar (X) */}
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-2 rounded-full bg-slate-100 hover:bg-red-500 hover:text-white text-slate-500 transition-all border border-slate-200 shadow-sm z-50"
          title="Cerrar y omitir aviso"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>

        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-bold text-red-600 tracking-tight">Caja Pendiente de Cierre</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            Hay una sesión de caja abierta ({openSession.cashierName || 'caja1'}) que requiere realizar el arqueo de cierre.
          </p>
          <div className="flex justify-end pt-1">
            <Button asChild size="sm" variant="destructive" className="h-9 px-4 font-bold shadow-lg hover:shadow-red-200 transition-all">
              <Link href="/cash-register/close" className="flex items-center gap-2">
                Ir al Cierre <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
