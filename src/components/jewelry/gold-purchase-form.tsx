"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Coins, Gem, Scale, User, Calculator, Save, Loader2 } from "lucide-react";
import { GoldPricingEngine } from "@/lib/services/gold-pricing-engine";
import { saveGoldPurchase, getLatestGoldPrice } from "@/lib/actions/gold-purchase";
import { useAuth } from "@/hooks/use-auth";
import { searchOrCreateCustomer } from "@/lib/actions/customers";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ReceiptTemplate } from "@/components/pos/receipt-template";
import { useSettings } from "@/hooks/use-settings";

const formSchema = z.object({
    customerName: z.string().min(2, "El nombre del cliente es obligatorio"),
    grossWeightGrams: z.coerce.number().positive("El peso debe ser mayor a 0"),
    purityPercent: z.coerce.number().min(0).max(100, "La pureza no puede exceder 100%"),
    marketPricePerOunce: z.coerce.number().positive("El precio de mercado es obligatorio"),
    marginPercent: z.coerce.number().min(0, "El factor de pago debe ser mayor o igual a 0"),
    exchangeRate: z.coerce.number().positive(),
});

type FormValues = z.infer<typeof formSchema>;

export function GoldPurchaseForm() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { settings } = useSettings();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastPurchaseReceipt, setLastPurchaseReceipt] = useState<any>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            customerName: "",
            grossWeightGrams: 0,
            purityPercent: 0,
            marketPricePerOunce: 0,
            marginPercent: 63, // Default: joyero paga 63% del valor de la pieza
            exchangeRate: settings?.exchangeRate ? parseFloat(settings.exchangeRate) : 36.5,
        },
    });

    const grossWeightGrams = useWatch({ control: form.control, name: "grossWeightGrams" });
    const purityPercent = useWatch({ control: form.control, name: "purityPercent" });
    const marketPricePerOunce = useWatch({ control: form.control, name: "marketPricePerOunce" });
    const marginPercent = useWatch({ control: form.control, name: "marginPercent" });
    const exchangeRate = useWatch({ control: form.control, name: "exchangeRate" });

    // Sync with settings when they load
    useEffect(() => {
        if (settings) {
            form.reset({
                ...form.getValues(),
                exchangeRate: parseFloat(settings.exchangeRate) || 36.5,
            });
        }
    }, [settings, form]);

    // Load latest price on mount
    useEffect(() => {
        getLatestGoldPrice().then((res) => {
            if (res.success && res.price) {
                form.setValue("marketPricePerOunce", res.price, {
                    shouldDirty: false,
                    shouldTouch: false,
                    shouldValidate: true,
                });
            }
        });
    }, [form]);

    // Real-time calculations
    const results = useMemo(() => {
        try {
            if (
                (grossWeightGrams ?? 0) > 0 &&
                (marketPricePerOunce ?? 0) > 0 &&
                (purityPercent ?? 0) > 0
            ) {
                return GoldPricingEngine.calculate({
                    grossWeightGrams: grossWeightGrams ?? 0,
                    purityPercent: purityPercent ?? 0,
                    marketPricePerOunce: marketPricePerOunce ?? 0,
                    marginPercent: marginPercent ?? 0,
                    exchangeRate: exchangeRate ?? 0,
                });
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }, [grossWeightGrams, marketPricePerOunce, purityPercent, marginPercent, exchangeRate]);

    async function onSubmit(values: FormValues) {
        if (!user) return;
        setIsSubmitting(true);

        try {
            // 1. Resolve Customer
            const customer = await searchOrCreateCustomer(values.customerName);

            // 2. Calculate final results for receipt
            const calcResults = GoldPricingEngine.calculate({
                grossWeightGrams: values.grossWeightGrams,
                purityPercent: values.purityPercent,
                marketPricePerOunce: values.marketPricePerOunce,
                marginPercent: values.marginPercent,
                exchangeRate: values.exchangeRate,
            });

            // 3. Save Purchase
            const res = await saveGoldPurchase({
                customerId: customer.id,
                userId: user.id,
                grossWeightGrams: values.grossWeightGrams,
                purityPercent: values.purityPercent,
                marketPricePerOunce: values.marketPricePerOunce,
                marginPercent: values.marginPercent,
                exchangeRate: values.exchangeRate,
                troyOunceGrams: 31.10,
            });

            if (res.success) {
                const savedPurchase = res.data;
                const ticketId = `Compra ${String(savedPurchase?.purchaseNumber || 0).padStart(5, '0')}`;
                const karatLabel = `${calcResults?.karatEquivalent.toFixed(2)}K`;

                const receiptData = {
                    pharmacyName: settings.ticketHeader.name,
                    address: settings.ticketHeader.address,
                    phone: settings.ticketHeader.phone,
                    rfc: settings.ticketHeader.rfc,
                    ticketId: ticketId,
                    date: new Date(),
                    cashierName: user.name || 'Comprador',
                    items: [{
                        quantity: 1,
                        description: `Compra Oro ${karatLabel} — ${values.grossWeightGrams}g`,
                        price: calcResults?.totalUSD || 0,
                        total: calcResults?.totalUSD || 0
                    }],
                    subtotal: calcResults?.totalPagar || 0,
                    tax: 0,
                    total: calcResults?.totalPagar || 0,
                    paymentMethod: 'Efectivo (NIO)',
                    amountPaid: calcResults?.totalPagar || 0,
                    change: 0,
                    footerMessage: settings.ticketFooter.message,
                    website: settings.ticketFooter.website,
                    logoSvg: settings.logoSvg,
                    currencySymbol: "C$"
                };

                setLastPurchaseReceipt(receiptData);

                toast({
                    title: "Compra registrada con éxito",
                    description: `Total pagado: C$ ${(calcResults?.totalPagar || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                });
                form.reset({
                    ...values,
                    customerName: "",
                    grossWeightGrams: 0,
                    purityPercent: 0,
                });
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo registrar la compra",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Gem className="h-5 w-5 text-amber-500" />
                        <CardTitle>Nueva Compra de Oro</CardTitle>
                    </div>
                    <CardDescription>
                        Ingrese los datos del material y los resultados del análisis XRF.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                            <FormField
                                control={form.control}
                                name="customerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Nombre completo del cliente" className="pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="grossWeightGrams"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Peso Bruto (g)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Scale className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        step="0.001"
                                                        className="pl-9"
                                                        {...field}
                                                        value={field.value === 0 ? "" : field.value}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="purityPercent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pureza XRF (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Calculator className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        step="0.001"
                                                        className="pl-9"
                                                        {...field}
                                                        value={field.value === 0 ? "" : field.value}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator className="my-1" />

                            <FormField
                                control={form.control}
                                name="marketPricePerOunce"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio de Mercado (USD/oz troy)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="Ej: 2300"
                                                    {...field}
                                                    value={field.value === 0 ? "" : field.value}
                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Se precarga con el último valor registrado, pero puedes editarlo.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="marginPercent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Factor de Pago al Cliente (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                {...field}
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="exchangeRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Cambio (C$/USD)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.0001" disabled {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="sticky bottom-0 -mx-6 mt-2 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Registrando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Registrar Compra
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className="bg-muted/50 border-amber-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Cálculos en Tiempo Real</CardTitle>
                        <CardDescription>Solo muestra el total final</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3.5">
                        <div className="rounded-xl bg-amber-50 p-5 border-2 border-amber-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-4xl font-black text-amber-950 tracking-tighter">
                                        C${results?.totalPagar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-amber-700/80 uppercase">Eq. USD</p>
                                    <p className="text-lg font-bold text-amber-900/90">
                                        ${results?.totalUSD.toFixed(2) ?? "0.00"}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-amber-200/50">
                                <p className="text-[11px] font-medium text-amber-800/70">
                                    Peso: {(grossWeightGrams ?? 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}g · Pureza: {(purityPercent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                </p>
                                <p className="text-[11px] font-medium text-amber-800/70 mt-1">
                                    Contenido de Oro Fino (Oz): {results?.fineGoldOunces.toFixed(4) ?? "0.0000"}
                                </p>
                                <p className="text-[11px] font-medium text-amber-800/70 mt-1">
                                    Kilataje Estimado: {results?.karatEquivalent.toFixed(2) ?? "0.00"}K
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hidden ReceiptTemplate for actual printing */}
            {lastPurchaseReceipt && <ReceiptTemplate {...lastPurchaseReceipt} />}

            <Dialog open={!!lastPurchaseReceipt} onOpenChange={(open: boolean) => { if (!open) setLastPurchaseReceipt(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Vista Previa de Compra</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-4 max-h-[60vh] overflow-y-auto">
                        {lastPurchaseReceipt && <ReceiptTemplate {...lastPurchaseReceipt} previewMode />}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            setTimeout(() => {
                                window.print();
                                setLastPurchaseReceipt(null);
                            }, 100);
                        }}>Imprimir Ticket</Button>
                        <Button variant="outline" onClick={() => setLastPurchaseReceipt(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
