'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getOverdueInstallments } from '@/lib/actions/installments';
import { AlertTriangle, BellRing } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from '@/lib/router-nav';

// Nota: no existe el asset mp3 en el proyecto; se sintetiza un beep con la
// Web Audio API (OscillatorNode) para no romper el autoplay bloqueado.
function playBeep() {
    try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        const ctx = new AudioContextCtor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => { ctx.close().catch(() => {}); }, 600);
    } catch (error) {
        console.log('Audio no soportado');
    }
}

export function OverdueInstallmentAlerts() {
    const { user } = useAuth();
    const router = useRouter();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'master-admin';

    const checkAlerts = useCallback(async () => {
        try {
            const res = await getOverdueInstallments();
            if (res && res.success && res.data && res.data.length > 0) {
                setAlerts(res.data);
                setIsOpen(true);
                playBeep();
            } else if (res && res.success) {
                setAlerts([]);
            }
        } catch (error) {
            console.log('No se pudieron consultar cuotas vencidas');
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        if (!hasChecked) {
            checkAlerts();
            setHasChecked(true);
        }
        timerRef.current = setInterval(checkAlerts, 5 * 60 * 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isAdmin, hasChecked, checkAlerts]);

    if (!isAdmin || alerts.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md border-red-500 shadow-2xl shadow-red-500/20">
                <DialogHeader className="flex flex-col items-center justify-center space-y-3 pb-4 border-b">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                        <BellRing className="h-8 w-8 text-red-600" />
                    </div>
                    <DialogTitle className="text-xl text-center font-bold text-red-600 uppercase">
                        ¡Cuotas Vencidas!
                    </DialogTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        Hay clientes con cuotas de crédito que ya vencieron y no han sido abonadas.
                    </p>
                </DialogHeader>

                <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {alerts.map(installment => (
                        <div key={installment.id} className="p-3 rounded-lg border-l-4 border-red-600 bg-red-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm">{installment.customer?.fullName || 'Cliente'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Factura: {installment.salesInvoice?.invoiceNumber || '—'} · Cuota #{installment.installmentNumber}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-primary">C$ {installment.amount.toFixed(2)}</p>
                                    <p className="text-xs font-bold text-red-600">
                                        Venció: {format(new Date(installment.dueDate), 'dd/MM/yyyy', { locale: es })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between border-t pt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Entendido
                    </Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/customers/credit');
                        }}
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Ver Clientes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}