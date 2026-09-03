'use client';

import React, { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { getPendingInvoicesAlerts } from '@/lib/actions/purchases';
import { useToast } from '@/hooks/use-toast';
import { BellRing, AlertTriangle } from 'lucide-react';
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

export function InvoiceAlerts() {
    const { settings } = useSettings();
    const { toast } = useToast();
    const router = useRouter();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        const checkAlerts = async () => {
            if (hasChecked) return;
            
            const alertDays = settings?.invoiceAlertDays || 5;
            const res = await getPendingInvoicesAlerts(alertDays);
            
            if (res.success && res.data && res.data.length > 0) {
                setAlerts(res.data);
                setIsOpen(true);
                
                // Play a subtle notification sound
                try {
                    const audio = new Audio('/sounds/notification.mp3');
                    // We catch the error because browsers might block autoplay without user interaction
                    audio.play().catch(e => console.log("Audio play prevented:", e));
                } catch (error) {
                    console.log("Audio not supported or missing");
                }
            }
            setHasChecked(true);
        };

        if (settings) {
            checkAlerts();
        }
    }, [settings, hasChecked]);

    if (alerts.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md border-red-500 shadow-2xl shadow-red-500/20">
                <DialogHeader className="flex flex-col items-center justify-center space-y-3 pb-4 border-b">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                        <BellRing className="h-8 w-8 text-red-600" />
                    </div>
                    <DialogTitle className="text-xl text-center font-bold text-red-600 uppercase">
                        ¡Alerta de Facturas!
                    </DialogTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        Tienes cuentas por pagar que están próximas a vencer o ya vencieron.
                    </p>
                </DialogHeader>

                <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {alerts.map(invoice => {
                        const dueDate = new Date(invoice.dueDate);
                        const isOverdue = dueDate < new Date();
                        
                        return (
                            <div key={invoice.id} className={`p-3 rounded-lg border-l-4 ${isOverdue ? 'border-red-600 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm">{invoice.supplierName}</p>
                                        <p className="text-xs text-muted-foreground">Factura: {invoice.invoiceNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary">C$ {invoice.totalAmount.toFixed(2)}</p>
                                        <p className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                                            Vence: {format(dueDate, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between border-t pt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Recordarme Luego
                    </Button>
                    <Button 
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/purchases');
                        }}
                    >
                        Ver Cuentas por Pagar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
