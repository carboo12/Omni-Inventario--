'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { updateSettings } from '@/lib/actions/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Loader2 } from 'lucide-react';

export function MasterKeyGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { settings, loading: settingsLoading } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [masterKey, setMasterKey] = useState('');
    const [confirmMasterKey, setConfirmMasterKey] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (settingsLoading || !user) return;

        // Check if user is admin and master key is missing
        if ((user.role === 'master-admin' || user.role === 'admin') && !settings.recoveryKey) {
            setIsOpen(true);
        }
    }, [user, settings, settingsLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (masterKey.length < 8) {
            toast({
                title: "Error",
                description: "La llave maestra debe tener al menos 8 caracteres.",
                variant: "destructive"
            });
            return;
        }

        if (masterKey !== confirmMasterKey) {
            toast({
                title: "Error",
                description: "Las llaves maestras no coinciden.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const dataToSave: any = {
                pharmacyName: settings?.ticketHeader?.name || "Pharmacy",
                address: settings?.ticketHeader?.address || "",
                phone: settings?.ticketHeader?.phone || "",
                currency: "NIO",
                taxRate: 0.15,
                applyTax: settings?.applyIVA || false,
                recoveryKey: masterKey,
                workflow: settings?.workflow || "dispatcher-cashier",
                quickSwitchEnabled: settings?.quickSwitchEnabled || false,
                exchangeRate: "36.5",
                allowCash: true,
                blockInsufficientCash: true,
                allowDollars: false,
                allowCard: true,
                isPremium: false,
            };

            const result = await updateSettings(dataToSave);

            if (result.success) {
                toast({
                    title: "¡Llave Maestra Configurada!",
                    description: "La llave maestra ha sido guardada exitosamente.",
                });
                setIsOpen(false);
                window.location.reload();
            } else {
                toast({
                    title: "Error",
                    description: "No se pudo guardar la llave maestra.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (settingsLoading) return null;

    return (
        <>
            {children}
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <div className="mx-auto bg-red-100 p-3 rounded-full mb-2">
                            <ShieldAlert className="h-8 w-8 text-red-600" />
                        </div>
                        <DialogTitle className="text-center text-xl">Configuración de Seguridad Requerida</DialogTitle>
                        <DialogDescription className="text-center">
                            Es obligatorio configurar una <strong>Llave Maestra de Recuperación</strong> para proteger el sistema.
                            Esta llave será necesaria para acciones críticas y recuperación de cuentas.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="masterKey">Llave Maestra</Label>
                            <Input
                                id="masterKey"
                                type="password"
                                value={masterKey}
                                onChange={(e) => setMasterKey(e.target.value)}
                                placeholder="Ingrese una clave segura"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmMasterKey">Confirmar Llave Maestra</Label>
                            <Input
                                id="confirmMasterKey"
                                type="password"
                                value={confirmMasterKey}
                                onChange={(e) => setConfirmMasterKey(e.target.value)}
                                placeholder="Repita la clave"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Guardar y Continuar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
