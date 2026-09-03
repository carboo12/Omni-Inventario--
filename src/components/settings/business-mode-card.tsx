"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, Gem, ShoppingBag, Truck, Workflow } from "lucide-react";
import { BusinessMode } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateBusinessMode } from "@/lib/actions/app-settings";
import { useBusinessMode } from "@/hooks/use-business-mode";
import { useSettings } from "@/hooks/use-settings";
import { updateSettings } from "@/lib/actions/settings";
import { logout } from "@/lib/actions/auth";

export function BusinessModeCard() {
    const { toast } = useToast();
    const { mode: currentMode } = useBusinessMode();
    const { settings } = useSettings();
    const [mode, setMode] = useState<BusinessMode>(currentMode || "PHARMACY");
    const [savedMode, setSavedMode] = useState<BusinessMode>(currentMode || "PHARMACY");
    const [workflow, setWorkflow] = useState<string>(settings.workflow || "dispatcher-cashier");
    const [savedWorkflow, setSavedWorkflow] = useState<string>(settings.workflow || "dispatcher-cashier");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setMode(currentMode);
        setSavedMode(currentMode);
        setWorkflow(settings.workflow || "dispatcher-cashier");
        setSavedWorkflow(settings.workflow || "dispatcher-cashier");
    }, [currentMode, settings.workflow]);

    const hasChanges = mode !== savedMode || workflow !== savedWorkflow;

    const handleSave = () => {
        startTransition(async () => {
            try {
                // Persistir primero el flujo de trabajo (SystemSettings.workflow).
                if (workflow !== savedWorkflow) {
                    await updateSettings({ workflow } as any);
                }
                // Luego persistir el modo de negocio (AppSettings.businessMode).
                await updateBusinessMode(mode);
                setSavedMode(mode);
                setSavedWorkflow(workflow);
                toast({
                    title: "Modo actualizado",
                    description: `El sistema ahora opera en modo ${mode === "PHARMACY" ? "Farmacia" : mode === "JEWELRY" ? "Joyería" : mode === "DISTRIBUIDORA" ? "Distribuidora" : "Boutique"}. Cerrando sesión para aplicar cambios...`,
                });

                // Wait 2 seconds for the user to see the toast, then logout + hard reload
                setTimeout(async () => {
                    await logout();
                    window.location.href = "/";
                }, 2000);
            } catch {
                toast({
                    title: "Error al guardar",
                    description: "No se pudo actualizar el modo de negocio.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Modo de Negocio</CardTitle>
                <CardDescription>
                    Define el modo de operación del sistema. Esto afecta los módulos disponibles y el flujo de ventas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <RadioGroup
                    value={mode}
                    onValueChange={(v) => setMode(v as BusinessMode)}
                    className="space-y-3"
                >
                    <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="PHARMACY" id="mode-pharmacy" className="mt-1" />
                        <Label htmlFor="mode-pharmacy" className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold">Farmacia</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">
                                Gestión de medicamentos, inventario por lote y fecha de vencimiento.
                            </p>
                        </Label>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="JEWELRY" id="mode-jewelry" className="mt-1" />
                        <Label htmlFor="mode-jewelry" className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Gem className="h-4 w-4 text-amber-500" />
                                <span className="font-semibold">Joyería</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">
                                Gestión de piezas de oro, compra de oro, reparaciones y apartados.
                            </p>
                        </Label>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="BOUTIQUE" id="mode-boutique" className="mt-1" />
                        <Label htmlFor="mode-boutique" className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <ShoppingBag className="h-4 w-4 text-pink-500" />
                                <span className="font-semibold">Boutique & Retail</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">
                                Venta de ropa, zapatos y accesorios con gestión de tallas, colores y marcas.
                            </p>
                        </Label>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="DISTRIBUIDORA" id="mode-distribuidora" className="mt-1" />
                        <Label htmlFor="mode-distribuidora" className="cursor-pointer flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck className="h-4 w-4 text-orange-500" />
                                <span className="font-semibold">Distribuidora</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal">
                                Facturación en red, productos varios, rutas de reparto y gestión de entregas.
                            </p>
                        </Label>
                    </div>
                </RadioGroup>

                {mode === 'DISTRIBUIDORA' && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <Workflow className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold">Flujo de Trabajo de Distribuidora</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Seleccione cómo se facturan las ventas en la red de distribución.
                                </p>
                            </div>
                        </div>
                        <RadioGroup value={workflow} onValueChange={(v) => setWorkflow(v)} className="space-y-2">
                            <div className="flex items-center space-x-2 rounded-md border bg-white p-3 cursor-pointer">
                                <RadioGroupItem value="cashier-only" id="wf-cashier-only" />
                                <Label htmlFor="wf-cashier-only" className="cursor-pointer flex-1">
                                    <span className="font-medium">Solo Cajero</span>
                                    <p className="text-xs text-muted-foreground font-normal">
                                        Un cajero toma y cobra el pedido directamente en el punto de venta.
                                    </p>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 rounded-md border bg-white p-3 cursor-pointer">
                                <RadioGroupItem value="dispatcher-cashier" id="wf-dispatcher-cashier" />
                                <Label htmlFor="wf-dispatcher-cashier" className="cursor-pointer flex-1">
                                    <span className="font-medium">Despachador y Cajero</span>
                                    <p className="text-xs text-muted-foreground font-normal">
                                        El despachador comanda el pedido y el cajero lo cobra desde la caja.
                                    </p>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isPending}
                    className="w-full"
                >
                    {isPending ? "Guardando..." : "Guardar Modo de Negocio"}
                </Button>
            </CardContent>
        </Card>
    );
}