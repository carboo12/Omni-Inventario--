
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Coins, DollarSign, CreditCard, ReceiptText, Percent, Download, KeyRound, Mail, Lock, RefreshCw, Eye, ShieldAlert, History, QrCode, Copy, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '@/hooks/use-settings';
import { LogoUploader } from '@/components/settings/logo-uploader';
import { BusinessModeCard } from '@/components/settings/business-mode-card';
import { JewelryMaterialsManager } from '@/components/settings/jewelry-materials-manager';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ReceiptTemplate } from '@/components/pos/receipt-template';
import Link from '@/lib/router-nav';

export default function SettingsPage() {
    const { settings, setSettings, saveSettings } = useSettings();
    const { mode } = useBusinessMode();
    const { toast } = useToast();

    const [isChangeKeyOpen, setIsChangeKeyOpen] = useState(false);
    const [oldKey, setOldKey] = useState("");
    const [newKey, setNewKey] = useState("");
    const [confirmKey, setConfirmKey] = useState("");
    const [isChangingKey, setIsChangingKey] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // URL base de acceso usando el hostname del servidor (window.location).
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
    const accessUrl = `${protocol}//${hostname}${port}`;

    const handleChangeMasterKey = async () => {
        if (!oldKey) {
            toast({ title: "Error", description: "Ingrese la llave maestra actual.", variant: "destructive" });
            return;
        }
        if (oldKey !== settings.recoveryKey) {
            toast({ title: "Error", description: "La llave maestra actual es incorrecta.", variant: "destructive" });
            return;
        }
        if (!newKey || newKey.length < 6) {
            toast({ title: "Error", description: "La nueva llave debe tener al menos 6 caracteres.", variant: "destructive" });
            return;
        }
        if (newKey !== confirmKey) {
            toast({ title: "Error", description: "La nueva llave y la confirmación no coinciden.", variant: "destructive" });
            return;
        }
        setIsChangingKey(true);
        setSettings(p => ({ ...p, recoveryKey: newKey }));
        await saveSettings();
        setIsChangingKey(false);
        setIsChangeKeyOpen(false);
        setOldKey("");
        setNewKey("");
        setConfirmKey("");
        toast({ title: "✅ Llave Actualizada", description: "La llave maestra ha sido cambiada exitosamente." });
    };

    const handleSave = async () => {
        const newRate = parseFloat(settings.exchangeRate);
        if (!isNaN(newRate) && newRate > 0) {
            await saveSettings();
            // Toast is handled in saveSettings now
        } else {
            toast({
                title: "Error",
                description: "Por favor, ingrese un tipo de cambio válido.",
                variant: "destructive",
            });
        }
    };

    const handleTicketHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, ticketHeader: { ...prev.ticketHeader, [name]: value } }));
    };

    const handleTicketFooterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, ticketFooter: { ...prev.ticketFooter, [name]: value } }));
    };

    const handleCheckboxChange = (name: keyof typeof settings, checked: boolean) => {
        setSettings(prev => ({ ...prev, [name]: checked }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Configuración</h1>
                <p className="text-muted-foreground">
                    Gestionar la configuración y las configuraciones de la aplicación.
                </p>
            </div>

            <div className='grid gap-6 lg:grid-cols-2 xl:grid-cols-3'>
                <div className="space-y-6 xl:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Regional</CardTitle>
                            <CardDescription>
                                Ajustes de moneda e impuestos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="font-semibold">Moneda Principal del Sistema</Label>
                                <RadioGroup value={settings.currency || 'NIO'} onValueChange={(v) => setSettings(p => ({ ...p, currency: v }))} className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="NIO" id="currency-nio" />
                                        <Label htmlFor="currency-nio">Córdoba Nicaragüense (C$) - Predeterminada</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="USD" id="currency-usd" />
                                        <Label htmlFor="currency-usd">Dólar Estadounidense ($)</Label>
                                    </div>
                                </RadioGroup>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Define la moneda prioritaria que se utilizará en todo el sistema (inventario, costos, precios de venta), dejando la otra como moneda secundaria calculada en base al tipo de cambio.
                                </p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="rate-nio" className="text-right">1 USD equivale a</Label>
                                <Input
                                    id="rate-nio"
                                    type="number"
                                    step="0.0001"
                                    value={settings.exchangeRate}
                                    onChange={(e) => setSettings(p => ({ ...p, exchangeRate: e.target.value }))}
                                    className="col-span-2"
                                />
                                <span className="col-start-2 col-span-2 text-muted-foreground text-sm">Córdoba Nicaragüense (C$)</span>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="troy-ounce" className="text-right">Onza Troy (peso)</Label>
                                <Input
                                    id="troy-ounce"
                                    type="number"
                                    step="0.0001"
                                    value={settings.troyOunceGrams}
                                    onChange={(e) => setSettings(p => ({ ...p, troyOunceGrams: parseFloat(e.target.value) || 0 }))}
                                    className="col-span-2"
                                />
                                <span className="col-start-2 col-span-2 text-muted-foreground text-sm">Ej: 31.10 (valor estándar de mostrador)</span>
                            </div>
                            <Separator />

                            <div className="flex items-start gap-4">
                                <Percent className="w-8 h-8 text-primary mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Impuestos</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="apply-iva" checked={settings.applyIVA} onCheckedChange={(c) => handleCheckboxChange('applyIVA', !!c)} />
                                        <Label htmlFor="apply-iva" className="text-sm font-normal">
                                            Aplicar IVA (15%) a las ventas
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                        Se añadirá el impuesto al total de cada venta en el POS.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Cuentas por Pagar</CardTitle>
                            <CardDescription>
                                Notificaciones de facturas de compras a crédito.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="invoice-alert-days">Días de anticipación para alerta de vencimiento</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="invoice-alert-days"
                                        type="number"
                                        min="1"
                                        value={settings.invoiceAlertDays || 5}
                                        onChange={(e) => setSettings(p => ({ ...p, invoiceAlertDays: parseInt(e.target.value) || 5 }))}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">días</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    El sistema emitirá una alerta sonora y visual esta cantidad de días antes de que venza una factura.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Importación de Inventario</CardTitle>
                            <CardDescription>
                                Configuración para la carga masiva de productos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-4">
                                <DollarSign className="w-8 h-8 text-green-600 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Importar en Dólares</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="import-dollars" checked={settings.importProductsInDollars} onCheckedChange={(c) => handleCheckboxChange('importProductsInDollars', !!c)} />
                                        <Label htmlFor="import-dollars" className="text-sm font-normal">
                                            Los precios en el Excel están en dólares (USD)
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                        Al habilitarlo, el sistema convertirá automáticamente los precios del Excel a Córdobas (C$) usando el tipo de cambio actual al momento de importar.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Flujo de Trabajo</CardTitle>
                            <CardDescription>
                                Configure si el negocio opera solo con cajero o con despachador y cajero.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={settings.workflow} onValueChange={(v) => setSettings(p => ({ ...p, workflow: v }))}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cashier-only" id="cashier-only" />
                                    <Label htmlFor="cashier-only">Solo Cajero</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="dispatcher-cashier" id="dispatcher-cashier" />
                                    <Label htmlFor="dispatcher-cashier">Despachador y Cajero</Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </div>

                <BusinessModeCard />

                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            Acceso a Dispositivos Móviles
                        </CardTitle>
                        <CardDescription>
                            Escanee el código o copie el enlace para abrir el POS en un teléfono o tablet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center p-4 bg-white rounded-xl border">
                            <QRCodeSVG value={accessUrl} size={180} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Input value={accessUrl} readOnly className="text-xs font-mono" />
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 gap-1.5"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(accessUrl);
                                        toast({ title: "✅ Enlace Copiado", description: "El enlace de acceso fue copiado." });
                                    } catch {
                                        toast({ title: "Error", description: "No se pudo copiar el enlace.", variant: "destructive" });
                                    }
                                }}
                            >
                                <Copy className="w-4 h-4" />
                                Copiar
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Hostname:</span> {hostname}
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.print()}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir / Descargar Tarjeta
                        </Button>
                    </CardContent>
                </Card>


                {mode === 'JEWELRY' && (
                    <Card className="xl:col-span-1 border-2 border-[#673AB7]/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-[#673AB7]">
                                <span className="text-lg">📍</span>
                                Modo de Este Dispositivo
                            </CardTitle>
                            <CardDescription>
                                Indica <strong>dónde está instalada</strong> esta app. Esto controla qué inventario se ve y gestiona aquí.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <RadioGroup value={settings.jewelryLocationMode} onValueChange={(v) => setSettings(p => ({ ...p, jewelryLocationMode: v }))}>
                                {/* HOME */}
                                <label
                                    htmlFor="loc-home"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        settings.jewelryLocationMode === 'HOME'
                                            ? 'border-[#673AB7] bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <RadioGroupItem value="HOME" id="loc-home" className="mt-0.5" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                                            🏠 Casa (Inventario A + B)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Ve todas las joyas de ambos locales. Usa este modo en la <strong>computadora de casa</strong> para controlar todo el inventario y sincronizar ventas de la tienda.
                                        </p>
                                    </div>
                                </label>

                                {/* STORE_A */}
                                <label
                                    htmlFor="loc-store-a"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        settings.jewelryLocationMode === 'STORE_A'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <RadioGroupItem value="STORE_A" id="loc-store-a" className="mt-0.5" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                                            🏪 Tienda A (Solo Inventario A)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Solo muestra y vende joyas del <strong>Inventario A</strong>. Úsalo si este dispositivo está en la tienda principal.
                                        </p>
                                    </div>
                                </label>

                                {/* STORE_B */}
                                <label
                                    htmlFor="loc-store-b"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        settings.jewelryLocationMode === 'STORE_B'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <RadioGroupItem value="STORE_B" id="loc-store-b" className="mt-0.5" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-sm">
                                            🏬 Tienda B (Solo Inventario B)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Solo muestra y vende joyas del <strong>Inventario B</strong>. Úsalo en la <strong>computadora de la tienda secundaria</strong> que trajo el CSV desde casa.
                                        </p>
                                    </div>
                                </label>
                            </RadioGroup>

                            {/* Quick save just for this setting */}
                            <div className="pt-2 border-t">
                                <Button
                                    size="sm"
                                    className="w-full bg-[#673AB7] hover:bg-[#5E35B1]"
                                    onClick={handleSave}
                                >
                                    Guardar Modo del Dispositivo
                                </Button>
                                <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                                    Este cambio afecta inmediatamente qué joyas se muestran en el inventario.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Formas de Pago</CardTitle>
                        <CardDescription>
                            Habilite y configure las formas de pago que desea utilizar al cobrar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Efectivo */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <Coins className="w-8 h-8 text-amber-500 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Efectivo</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="block-insufficient-cash" checked={settings.blockInsufficientCash} onCheckedChange={(c) => handleCheckboxChange('blockInsufficientCash', !!c)} />
                                        <Label htmlFor="block-insufficient-cash" className="text-sm font-normal text-muted-foreground">
                                            No permitir cobrar si el efectivo ingresado es menor que el total de la venta.
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Dólares Americanos */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <DollarSign className="w-8 h-8 text-green-600 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Dólares Americanos</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="enable-dollars" checked={settings.allowDollars} onCheckedChange={(c) => handleCheckboxChange('allowDollars', !!c)} />
                                        <Label htmlFor="enable-dollars" className="text-sm font-normal">
                                            Deseo habilitar el cobro en Dólares Americanos
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                        Al habilitarlo podrás realizar el cobro en dólares.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Tarjeta de crédito */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <CreditCard className="w-8 h-8 text-blue-600 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Tarjeta de crédito</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="enable-card" checked={settings.allowCard} onCheckedChange={(c) => handleCheckboxChange('allowCard', !!c)} />
                                        <Label htmlFor="enable-card" className="text-sm font-normal">
                                            Deseo habilitar cobro con Tarjeta de Crédito/Débito
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                        Podrás registrar el pago de la venta con tarjeta y obtener el reporte de ingresos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Crédito por cuotas (financiamiento) */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <ReceiptText className="w-8 h-8 text-violet-600 mt-1" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-lg">Crédito por cuotas</h4>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Checkbox id="enable-credit-financing" checked={settings.creditFinancingEnabled} onCheckedChange={(c) => handleCheckboxChange('creditFinancingEnabled', !!c)} />
                                        <Label htmlFor="enable-credit-financing" className="text-sm font-normal">
                                            Deseo habilitar financiamiento en ventas al crédito
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                        Al vender al crédito podrás dividir el total en cuotas (semanal, quincenal o mensual) con interés.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Personalización del Ticket</CardTitle>
                                <CardDescription>
                                    Configure la información que aparecerá en el ticket de venta.
                                </CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => setIsPreviewOpen(true)}
                            >
                                <Eye className="w-4 h-4" />
                                Vista Previa
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className='space-y-4'>
                            <Label className="font-semibold">Encabezado del Ticket</Label>
                            <Input name="name" placeholder="Nombre" value={settings.ticketHeader.name} onChange={handleTicketHeaderChange} />
                            <Textarea name="address" placeholder="Descripción / Dirección" value={settings.ticketHeader.address} onChange={handleTicketHeaderChange} rows={3} />
                            <Input name="phone" placeholder="Teléfono" value={settings.ticketHeader.phone} onChange={handleTicketHeaderChange} />
                            <Input name="rfc" placeholder="RFC / Identificación Fiscal" value={settings.ticketHeader.rfc} onChange={handleTicketHeaderChange} />
                        </div>
                        <Separator />
                        <div className='space-y-4'>
                            <Label className="font-semibold">Pie de Página del Ticket</Label>
                            <Textarea name="message" placeholder="Mensaje de agradecimiento" value={settings.ticketFooter.message} onChange={handleTicketFooterChange} rows={2} />
                            <Input name="website" placeholder="Sitio web o información adicional" value={settings.ticketFooter.website} onChange={handleTicketFooterChange} />
                        </div>
                        <Separator />
                        <div className='space-y-4'>
                            <Label className="font-semibold">Opciones de Impresión</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="include-unit-price" checked={settings.includeUnitPrice} onCheckedChange={(c) => handleCheckboxChange('includeUnitPrice', !!c)} />
                                <Label htmlFor="include-unit-price" className="text-sm font-normal">
                                    Incluir Precio Unitario en la impresión del ticket.
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="print-full-description" checked={settings.printFullDescription} onCheckedChange={(c) => handleCheckboxChange('printFullDescription', !!c)} />
                                <Label htmlFor="print-full-description" className="text-sm font-normal">
                                    Imprimir descripción completa (varios renglones).
                                </Label>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Logo Personalizado - Solo Premium */}
                <LogoUploader
                    currentLogo={settings.logoSvg}
                    isPremium={settings.isPremium}
                    onLogoChange={async () => {
                        window.location.reload();
                    }}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 mt-6">
                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Seguridad y Recuperación</CardTitle>
                        <CardDescription>
                            Configure las opciones de recuperación de cuenta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="font-semibold">Llave Maestra de Recuperación</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Esta llave permite a los usuarios bloqueados restablecer su contraseña sin intervención del administrador. ¡Manténgala segura!
                                </p>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {settings.recoveryKey ? "•".repeat(Math.min(settings.recoveryKey.length, 10)) : "No configurada"}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsChangeKeyOpen(true)}
                                >
                                    Cambiar Llave
                                </Button>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="quick-switch"
                                checked={settings.quickSwitchEnabled}
                                onCheckedChange={(c) => handleCheckboxChange('quickSwitchEnabled', !!c)}
                            />
                            <Label htmlFor="quick-switch" className="text-sm font-normal">
                                Habilitar cambio rápido de usuario
                            </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                            Muestra un botón en la barra superior para cambiar de usuario rápidamente sin cerrar sesión completamente.
                        </p>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Copia de Seguridad</CardTitle>
                        <CardDescription>
                            Descargue una copia completa de la base de datos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Se generará un archivo JSON con toda la información del sistema (usuarios, productos, ventas, etc.). Guarde este archivo en un lugar seguro.
                            </p>
                            <Button variant="outline" className="w-full" onClick={async () => {
                                const { generateBackup } = await import('@/lib/actions/backup');
                                const result = await generateBackup();
                                if (result.success && result.data) {
                                    const blob = new Blob([result.data], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `backup-sistema-${new Date().toISOString().split('T')[0]}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                } else {
                                    alert('Error al generar el backup');
                                }
                            }}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Respaldo (JSON)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-1 border-2 border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Gestión de Licencia
                        </CardTitle>
                        <CardDescription>
                            Estado y renovación de su suscripción anual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                            <span className="text-sm font-medium">Estado</span>
                            {(() => {
                                const isDemo = settings.licenseStatus === 'demo';
                                const isRegistered = settings.licenseStatus === 'registered';
                                const badgeClass = isDemo
                                    ? 'bg-amber-100 text-amber-700'
                                    : isRegistered
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700';
                                const label = isDemo
                                    ? 'Licencia Demo'
                                    : isRegistered
                                        ? 'Registrado / Aprobado'
                                        : 'No Registrado / Expirado';
                                return (
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${badgeClass}`}>
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Fecha de Inicio</span>
                                <span className="font-medium">
                                    {settings.licenseStartDate 
                                        ? new Date(settings.licenseStartDate).toLocaleDateString() 
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Fecha de Expiración</span>
                                <span className="font-medium text-primary">
                                    {settings.licenseExpirationDate 
                                        ? new Date(settings.licenseExpirationDate).toLocaleDateString() 
                                        : 'N/A'}
                                </span>
                            </div>
                            {settings.licenseStatus === 'demo' && settings.licenseExpirationDate && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-semibold">Días Restantes (Demo)</span>
                                    <span className="font-medium text-amber-600">
                                        {(() => {
                                            const remaining = Math.max(0, Math.floor((new Date(settings.licenseExpirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                            return `${remaining} día${remaining !== 1 ? 's' : ''}`;
                                        })()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <Button 
                            variant="default" 
                            className="w-full bg-primary hover:bg-primary/90 font-bold"
                            onClick={async () => {
                                const { renewLicense } = await import('@/lib/actions/license');
                                const res = await renewLicense(1);
                                if (res.success) {
                                    toast({ title: "✅ Licencia Renovada", description: "Se ha extendido su licencia por 1 año adicional." });
                                    window.location.reload();
                                } else {
                                    toast({ title: "Error", description: res.error || "No se pudo renovar la licencia.", variant: "destructive" });
                                }
                            }}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renovar por 1 Año
                        </Button>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            Notificaciones por Correo
                        </CardTitle>
                        <CardDescription>
                            Configurar reportes automáticos de apertura y cierre de caja.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="email-notifications">Habilitar Notificaciones</Label>
                            <Switch 
                                id="email-notifications" 
                                checked={settings.emailNotificationsEnabled} 
                                onCheckedChange={(c) => setSettings(p => ({ ...p, emailNotificationsEnabled: c }))}
                            />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                            <Label htmlFor="admin-email">Correo del Administrador (Para Recibir)</Label>
                            <Input 
                                id="admin-email" 
                                type="email" 
                                placeholder="admin@gmail.com" 
                                value={settings.adminEmail || ""} 
                                onChange={(e) => setSettings(p => ({ ...p, adminEmail: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">Este correo recibirá los reportes de caja.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smtp-email">Cuenta Gmail de Envío</Label>
                            <Input 
                                id="smtp-email" 
                                type="email" 
                                placeholder="sistema@gmail.com" 
                                value={settings.smtpEmail || ""} 
                                onChange={(e) => setSettings(p => ({ ...p, smtpEmail: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smtp-pass">Contraseña de Aplicación</Label>
                            <Input 
                                id="smtp-pass" 
                                type="password" 
                                placeholder="•••• •••• •••• ••••" 
                                value={settings.smtpPassword || ""} 
                                onChange={(e) => setSettings(p => ({ ...p, smtpPassword: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Use una <strong>Contraseña de Aplicación</strong> generada en su cuenta Google.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {mode === 'JEWELRY' && (
                    <div className="xl:col-span-1">
                        <JewelryMaterialsManager />
                    </div>
                )}

                <Card className="xl:col-span-1 bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <ShieldAlert className="w-5 h-5" />
                            Auditoría del Sistema
                        </CardTitle>
                        <CardDescription>
                            Registro detallado de acciones de usuarios y cambios críticos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Consulte el historial de quién ha realizado cambios en precios, inventario, clientes y configuraciones de seguridad.
                        </p>
                        <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/10" asChild>
                            <Link href="/settings/audit">
                                <History className="mr-2 h-4 w-4" />
                                Ver Log de Auditoría
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave}>Guardar Cambios</Button>
            </div>

            {/* Change Master Key Dialog */}
            <Dialog open={isChangeKeyOpen} onOpenChange={(open) => {
                setIsChangeKeyOpen(open);
                if (!open) { setOldKey(""); setNewKey(""); setConfirmKey(""); }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-primary" />
                            Cambiar Llave Maestra
                        </DialogTitle>
                        <DialogDescription>
                            Ingrese la llave maestra actual para poder establecer una nueva.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="old-key">Llave Actual</Label>
                            <Input
                                id="old-key"
                                type="password"
                                placeholder="••••••••"
                                value={oldKey}
                                onChange={(e) => setOldKey(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="new-key">Nueva Llave</Label>
                            <Input
                                id="new-key"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="confirm-key">Confirmar Nueva Llave</Label>
                            <Input
                                id="confirm-key"
                                type="password"
                                placeholder="Repita la nueva llave"
                                value={confirmKey}
                                onChange={(e) => setConfirmKey(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangeKeyOpen(false)}>Cancelar</Button>
                        <Button onClick={handleChangeMasterKey} disabled={isChangingKey}>
                            {isChangingKey ? "Guardando..." : "Cambiar Llave"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-[400px] p-0 bg-gray-100 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-4 bg-white border-b">
                        <DialogTitle>Vista Previa del Ticket</DialogTitle>
                        <DialogDescription>
                            Así es como se verá tu ticket impreso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 max-h-[70vh] overflow-y-auto flex justify-center bg-slate-200">
                        <div className="bg-white shadow-lg p-1">
                            <ReceiptTemplate 
                                pharmacyName={settings.ticketHeader.name}
                                address={settings.ticketHeader.address}
                                phone={settings.ticketHeader.phone}
                                rfc={settings.ticketHeader.rfc}
                                ticketId="T-000001"
                                date={new Date()}
                                cashierName="Cajero Ejemplo"
                                items={[
                                    { quantity: 1, description: "Producto de Ejemplo A", price: 100, total: 100 },
                                    { quantity: 2, description: "Producto de Ejemplo B", price: 50, total: 100 }
                                ]}
                                subtotal={200}
                                tax={settings.applyIVA ? 30 : 0}
                                total={settings.applyIVA ? 230 : 200}
                                paymentMethod="Efectivo"
                                amountPaid={250}
                                change={settings.applyIVA ? 20 : 50}
                                footerMessage={settings.ticketFooter.message}
                                website={settings.ticketFooter.website}
                                logoSvg={settings.logoSvg}
                                previewMode={true}
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-4 bg-white border-t">
                        <Button onClick={() => setIsPreviewOpen(false)} className="w-full">Cerrar Vista Previa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
