'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateReceiptSettings, getReceiptSettings } from '@/lib/actions-client/receipt-settings';
import { buildCustomItemText, buildInlineItemText, formatUnitLabel, resolveReceiptFontFamily, type PresentationLayout } from '@/lib/receipt-presentation';
import { resetReceiptSettingsCache } from '@/hooks/use-receipt-settings';
import {
    Save, Type, AlignLeft, Layout, Eye, RotateCcw,
    Printer, Sliders, ToggleLeft, Loader2
} from 'lucide-react';

// ─────────────────────────────────────────────
//  Objeto de valores por defecto (BLINDAJE)
// ─────────────────────────────────────────────
export const DEFAULT_RECEIPT_SETTINGS = {
    fontFamily: 'monospace',
    ticketWidth: '80mm',
    lineHeight: 1.2,
    paddingX: 0,
    fontSizeTitle: 16,
    fontSizeHeader: 11,
    fontSizeBody: 11,
    fontSizePresentation: 9,
    fontSizeTotals: 12,
    fontSizeFooter: 10,
    presentationLayout: 'BELOW_NAME' as PresentationLayout,
    presentationCustomFormat: '{cantidad} {presentacion} de: {nombre}',
    showLogo: true,
    showClientInfo: true,
    showEquivalenceUsd: true,
    footerMessage: '¡Gracias por su compra!',
};

type ReceiptSettings = Omit<typeof DEFAULT_RECEIPT_SETTINGS, 'presentationLayout'> & {
    presentationLayout: PresentationLayout;
    presentationCustomFormat: string;
};

// ─────────────────────────────────────────────
//  Datos simulados para vista previa
// ─────────────────────────────────────────────
const MOCK_SALE = {
    pharmacyName: 'Farmacia San Juan',
    address: 'Km 4 Carretera Norte\nManagua, Nicaragua',
    phone: 'Tel: 2555-1234',
    rfc: 'RUC: J0310000123456',
    ticketId: 'F-002847',
    cashierName: 'María González',
    clientName: 'Carlos López',
    items: [
        { quantity: 2, description: 'Amoxicilina 500mg', price: 45.00, total: 90.00, unit: 'Caja x 30 cáp.' },
        { quantity: 1, description: 'Ibuprofeno 400mg', price: 32.50, total: 32.50, unit: 'Blíster x 20 tab.' },
        { quantity: 3, description: 'Vitamina C 1000mg', price: 28.00, total: 84.00, unit: '(Caja x 10 sob)' },
    ],
    subtotal: 180.87,
    tax: 27.13,
    total: 208.00,
    paymentMethod: 'Efectivo',
    amountPaid: 250.00,
    change: 42.00,
    exchangeRate: 36.5,
};

// ─────────────────────────────────────────────
//  Componente de vista previa (WYSIWYG)
// ─────────────────────────────────────────────
/**
 * Las dos disposiciones comparten el formateo de `receipt-presentation` con el
 * POS y con el HTML impreso, así la vista previa no difiere del papel.
 */

function ReceiptPreview({ settings }: { settings: ReceiptSettings }) {
    // Fallback defensivo para cada propiedad
    const fontFamily = resolveReceiptFontFamily(settings?.fontFamily);
    const ticketWidth = settings?.ticketWidth || '80mm';
    const lineHeight = settings?.lineHeight ?? 1.2;
    const paddingX = settings?.paddingX ?? 0;
    const fontSizeTitle = settings?.fontSizeTitle ?? 16;
    const fontSizeHeader = settings?.fontSizeHeader ?? 11;
    const fontSizeBody = settings?.fontSizeBody ?? 11;
    const fontSizePresentation = settings?.fontSizePresentation ?? 9;
    const fontSizeTotals = settings?.fontSizeTotals ?? 12;
    const fontSizeFooter = settings?.fontSizeFooter ?? 10;
    const isInline = settings?.presentationLayout === 'INLINE_QTY';
    const isCustom = settings?.presentationLayout === 'CUSTOM';
    const showLogo = settings?.showLogo !== false;
    const showClientInfo = settings?.showClientInfo !== false;
    const showEquivUSD = settings?.showEquivalenceUsd !== false;
    const footerMessage = settings?.footerMessage || '';

    // Ancho visual aproximado en pantalla
    const containerWidth = ticketWidth === '58mm' ? '218px' : '302px';

    return (
        <div style={{
            fontFamily,
            width: containerWidth,
            maxWidth: containerWidth,
            lineHeight,
            padding: `8px ${paddingX + 8}px`,
            backgroundColor: '#fff',
            color: '#000',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: `${fontSizeBody}px`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            margin: '0 auto',
            minHeight: '420px',
        }}>
            {/* Encabezado */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                {showLogo && <div style={{ fontSize: '22px', marginBottom: '2px' }}>🏥</div>}
                <div style={{ fontSize: `${fontSizeTitle}px`, fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {MOCK_SALE.pharmacyName}
                </div>
                <div style={{ fontSize: `${fontSizeHeader}px`, whiteSpace: 'pre-line' }}>
                    {MOCK_SALE.address}
                </div>
                <div style={{ fontSize: `${fontSizeHeader}px` }}>{MOCK_SALE.phone}</div>
                <div style={{ fontSize: `${fontSizeHeader}px` }}>{MOCK_SALE.rfc}</div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            {/* Datos del cliente */}
            {showClientInfo ? (
                <div style={{ fontSize: `${fontSizeHeader}px`, marginBottom: '4px' }}>
                    <div>Ticket: {MOCK_SALE.ticketId}</div>
                    <div>Fecha: {new Date().toLocaleDateString('es-NI')}</div>
                    <div>Cajero: {MOCK_SALE.cashierName}</div>
                    <div>Cliente: {MOCK_SALE.clientName}</div>
                </div>
            ) : (
                <div style={{ fontSize: `${fontSizeHeader}px`, marginBottom: '4px' }}>
                    <div>Ticket: {MOCK_SALE.ticketId}</div>
                    <div>Fecha: {new Date().toLocaleDateString('es-NI')}</div>
                </div>
            )}

            {/* Encabezado de artículos */}
            <div style={{
                borderTop: '1px solid #000', borderBottom: '1px solid #000',
                padding: '2px 0', fontWeight: 'bold', textAlign: 'center',
                fontSize: `${fontSizeBody}px`, margin: '4px 0',
                textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
                Detalle Factura
            </div>

            {/* Artículos */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${fontSizeBody}px` }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ textAlign: 'left', width: '12%', padding: '1px' }}>Cant</th>
                        <th style={{ textAlign: 'left', width: '48%', padding: '1px' }}>Producto</th>
                        <th style={{ textAlign: 'right', width: '20%', padding: '1px' }}>P.U.</th>
                        <th style={{ textAlign: 'right', width: '20%', padding: '1px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {MOCK_SALE.items.map((item, i) => {
                        // EN LÍNEA CON LA CANTIDAD → [Cantidad] [Presentación de:] [Nombre] [P.U.] [Total]
                        // ABAJO DEL NOMBRE → [Cantidad] [Nombre] [P.U.] [Total] + presentación en 2.ª línea
                        const inlineItem = isInline
                            ? buildInlineItemText(item.description, item.unit)
                            : null;
                        const presentationText = isInline
                            ? inlineItem?.presentation
                            : formatUnitLabel(item.unit);
                        const customText = isCustom
                            ? buildCustomItemText(settings.presentationCustomFormat, item)
                            : '';
                        return (
                            <tr key={i} style={{ borderTop: '1px dashed #aaa' }}>
                                <td style={{ verticalAlign: 'top', paddingTop: '2px', fontWeight: 'bold' }}>
                                    {isCustom ? '' : item.quantity}
                                </td>
                                <td style={{ verticalAlign: 'top', paddingTop: '2px', wordBreak: 'break-word' }}>
                                    {isCustom ? (
                                        <div style={{ fontSize: `${fontSizeBody}px` }}>{customText}</div>
                                    ) : isInline ? (
                                        <div style={{ fontSize: `${fontSizeBody}px` }}>
                                            {presentationText && (
                                                <span style={{ fontSize: `${fontSizePresentation}px`, margin: '0 3px' }}>
                                                    {presentationText}
                                                </span>
                                            )}
                                            <span>{inlineItem?.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: `${fontSizeBody}px` }}>{item.description}</div>
                                            {presentationText && (
                                                <div style={{ fontSize: `${fontSizePresentation}px`, color: '#555', fontStyle: 'italic' }}>
                                                    {presentationText}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                                    {item.price.toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                                    {item.total.toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            {/* Totales */}
            <div style={{ fontSize: `${fontSizeTotals}px` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span><span>C$ {MOCK_SALE.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>IVA:</span><span>C$ {MOCK_SALE.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: `${fontSizeTotals + 5}px`, marginTop: '2px' }}>
                    <span>TOTAL:</span><span>C$ {MOCK_SALE.total.toFixed(2)}</span>
                </div>
                {showEquivUSD && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${fontSizeFooter}px`, fontStyle: 'italic', color: '#555' }}>
                        <span>Equiv. USD:</span><span>$ {(MOCK_SALE.total / MOCK_SALE.exchangeRate).toFixed(2)}</span>
                    </div>
                )}
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

            {/* Pago */}
            <div style={{ fontSize: `${fontSizeBody}px` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pago ({MOCK_SALE.paymentMethod}):</span>
                    <span>C$ {MOCK_SALE.amountPaid.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cambio:</span><span>C$ {MOCK_SALE.change.toFixed(2)}</span>
                </div>
            </div>

            {/* Pie de página */}
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: `${fontSizeFooter}px` }}>
                {footerMessage && (
                    <div style={{ whiteSpace: 'pre-line' }}>{footerMessage}</div>
                )}
                <div style={{ fontWeight: 'bold', marginTop: '4px' }}>*** GRACIAS POR SU COMPRA ***</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
//  Slider con etiqueta y badge px
// ─────────────────────────────────────────────
function FontSlider({ label, value, onChange, min = 7, max = 24 }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {value ?? '-'}px
                </span>
            </div>
            <Slider
                min={min} max={max} step={1}
                value={[value ?? min]}
                onValueChange={([v]) => onChange(v)}
                className="w-full"
            />
        </div>
    );
}

// ─────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────
export default function TicketSettingsClient() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<ReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Carga los ajustes desde la BD al montar
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getReceiptSettings();
                if (!cancelled) {
                    if (res?.success && res?.data) {
                        // Merge con defaults para proteger campos faltantes
                        setSettings({ ...DEFAULT_RECEIPT_SETTINGS, ...res.data });
                    }
                    // Si falla o no hay datos, ya tenemos DEFAULT_RECEIPT_SETTINGS
                }
            } catch {
                // Silencioso — se usan los defaults
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const update = useCallback(<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateReceiptSettings(settings);
            if (result?.success) {
                // La caché de `useReceiptSettings` es de módulo y sobrevive a la
                // navegación: sin invalidarla, el POS de esta misma pestaña
                // seguiría imprimiendo con el diseño anterior hasta recargar.
                resetReceiptSettingsCache();
                toast({ title: '✅ Configuración Guardada', description: 'Los cambios se aplicarán en la próxima impresión.' });
            } else {
                toast({ title: 'Error', description: (result as any)?.error || 'No se pudo guardar.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexión.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * "Restablecer Valores por Defecto": vuelve el formulario a
     * DEFAULT_RECEIPT_SETTINGS sin tocar la BD; el usuario confirma con Guardar.
     */
    const handleReset = () => {
        setSettings({ ...DEFAULT_RECEIPT_SETTINGS });
        toast({
            title: 'Valores por defecto restaurados',
            description: 'El formulario volvió a la configuración predeterminada. Presiona "Guardar Configuración" para aplicarla y guardarla en la base de datos.',
        });
    };

    // ── Estado de carga ──
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando configuración del ticket...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
                        <Printer className="w-7 h-7 text-primary" />
                        Personalización de Ticket
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configura tamaños, márgenes y disposición del ticket térmico. La vista previa se actualiza en tiempo real.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Restablecer Valores por Defecto
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">

                {/* ── Panel izquierdo: Controles ── */}
                <div className="space-y-4">

                    {/* Tipografía y formato */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Type className="w-4 h-4 text-primary" />
                                Tipografía y Formato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fuente</Label>
                                    <Select
                                        value={settings?.fontFamily || 'monospace'}
                                        onValueChange={v => update('fontFamily', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monospace">Monospace (Courier)</SelectItem>
                                            <SelectItem value="sans-serif">Sans-serif (Arial)</SelectItem>
                                            <SelectItem value="roboto-mono">Roboto Mono (Moderna POS)</SelectItem>
                                            <SelectItem value="inconsolata">Inconsolata (Térmica Compacta)</SelectItem>
                                            <SelectItem value="inter">Inter / System (Limpia Moderna)</SelectItem>
                                            <SelectItem value="ticket-classic">Ticket Clásico (Dot Matrix)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ancho de Papel</Label>
                                    <Select
                                        value={settings?.ticketWidth || '80mm'}
                                        onValueChange={v => update('ticketWidth', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="80mm">80mm (estándar)</SelectItem>
                                            <SelectItem value="58mm">58mm (compacto)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Interlineado</Label>
                                        <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                            {settings?.lineHeight ?? 1.2}
                                        </span>
                                    </div>
                                    <Slider
                                        min={1.0} max={2.0} step={0.1}
                                        value={[settings?.lineHeight ?? 1.2]}
                                        onValueChange={([v]) => update('lineHeight', v)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Margen Lateral</Label>
                                        <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                            {settings?.paddingX ?? 0}px
                                        </span>
                                    </div>
                                    <Slider
                                        min={0} max={16} step={1}
                                        value={[settings?.paddingX ?? 0]}
                                        onValueChange={([v]) => update('paddingX', v)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tamaños de fuente */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sliders className="w-4 h-4 text-primary" />
                                Tamaños de Fuente
                            </CardTitle>
                            <CardDescription>Ajusta el tamaño de cada sección en píxeles (px).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <FontSlider label="🏪 Nombre del Negocio (Título)" value={settings?.fontSizeTitle ?? 16} onChange={v => update('fontSizeTitle', v)} min={10} max={28} />
                            <FontSlider label="📋 Encabezado (Dirección, RUC, Cliente)" value={settings?.fontSizeHeader ?? 11} onChange={v => update('fontSizeHeader', v)} />
                            <Separator />
                            <FontSlider label="🛒 Nombre de Productos (Cuerpo)" value={settings?.fontSizeBody ?? 11} onChange={v => update('fontSizeBody', v)} />
                            <FontSlider label="📦 Presentación / Unidad de Medida" value={settings?.fontSizePresentation ?? 9} onChange={v => update('fontSizePresentation', v)} min={6} max={14} />
                            <Separator />
                            <FontSlider label="💰 Totales y Precios" value={settings?.fontSizeTotals ?? 12} onChange={v => update('fontSizeTotals', v)} />
                            <FontSlider label="✉️ Pie de Página" value={settings?.fontSizeFooter ?? 10} onChange={v => update('fontSizeFooter', v)} />
                        </CardContent>
                    </Card>

                    {/* Disposición de la presentación */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Layout className="w-4 h-4 text-primary" />
                                Disposición de la Presentación
                            </CardTitle>
                            <CardDescription>
                                ¿Cómo se muestra la unidad/presentación del producto?
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                value={settings?.presentationLayout || 'BELOW_NAME'}
                                onValueChange={v => update('presentationLayout', v as PresentationLayout)}
                                className="space-y-3"
                            >
                                <label
                                    htmlFor="layout-below"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        (settings?.presentationLayout || 'BELOW_NAME') === 'BELOW_NAME'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <RadioGroupItem value="BELOW_NAME" id="layout-below" className="mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-sm">Abajo del Nombre</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            La presentación se muestra en una línea secundaria (más legible).
                                        </div>
                                        <div className="mt-1.5 font-mono text-xs bg-muted rounded px-2 py-1 leading-relaxed">
                                            <div>Amoxicilina 500mg</div>
                                            <div className="text-muted-foreground italic">(Caja x 30 cáp.)</div>
                                        </div>
                                    </div>
                                </label>
                                <label
                                    htmlFor="layout-inline"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        settings?.presentationLayout === 'INLINE_QTY'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <RadioGroupItem value="INLINE_QTY" id="layout-inline" className="mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-sm">En Línea con la Cantidad</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            La cantidad, la presentación y el nombre se muestran en una sola línea continua, unidos con "de:" (más compacto).
                                        </div>
                                        <div className="mt-1.5 font-mono text-xs bg-muted rounded px-2 py-1 whitespace-pre overflow-x-auto">2 Cajas de: Amoxicilina 500mg       150       300</div>
                                    </div>
                                </label>
                                <label
                                    htmlFor="layout-custom"
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        settings?.presentationLayout === 'CUSTOM'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <RadioGroupItem value="CUSTOM" id="layout-custom" className="mt-0.5" />
                                    <div>
                                        <div className="font-semibold text-sm">Personalizado (Manual)</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            Define manualmente la estructura y orden del texto utilizando plantillas de variables dinámicas.
                                        </div>
                                        <div className="mt-1.5 font-mono text-xs bg-muted rounded px-2 py-1">
                                            {buildCustomItemText(settings.presentationCustomFormat, MOCK_SALE.items[0])}
                                        </div>
                                    </div>
                                </label>
                            </RadioGroup>
                            {settings?.presentationLayout === 'CUSTOM' && (
                                <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3">
                                    <Label htmlFor="presentation-custom-format">Formato Personalizado</Label>
                                    <Input
                                        id="presentation-custom-format"
                                        value={settings.presentationCustomFormat}
                                        onChange={event => update('presentationCustomFormat', event.target.value)}
                                        placeholder="{cantidad} {presentacion} de: {nombre}"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {['{cantidad}', '{presentacion}', '{nombre}', '{precio}', '{total}'].map(variable => (
                                            <code key={variable} className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">{variable}</code>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Vista previa: {buildCustomItemText(settings.presentationCustomFormat, MOCK_SALE.items[0])}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Elementos visibles */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ToggleLeft className="w-4 h-4 text-primary" />
                                Elementos Visibles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Mostrar Logo</Label>
                                    <p className="text-xs text-muted-foreground">Incluye el logo en el encabezado del ticket</p>
                                </div>
                                <Switch
                                    checked={settings?.showLogo !== false}
                                    onCheckedChange={v => update('showLogo', v)}
                                />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Datos del Cliente</Label>
                                    <p className="text-xs text-muted-foreground">Nombre y teléfono del cliente en el ticket</p>
                                </div>
                                <Switch
                                    checked={settings?.showClientInfo !== false}
                                    onCheckedChange={v => update('showClientInfo', v)}
                                />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Equivalente en USD</Label>
                                    <p className="text-xs text-muted-foreground">Mostrar total convertido a dólares</p>
                                </div>
                                <Switch
                                    checked={settings?.showEquivalenceUsd !== false}
                                    onCheckedChange={v => update('showEquivalenceUsd', v)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mensaje del pie */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlignLeft className="w-4 h-4 text-primary" />
                                Mensaje del Pie de Página
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={settings?.footerMessage || ''}
                                onChange={e => update('footerMessage', e.target.value)}
                                placeholder="¡Gracias por su compra! Vuelva pronto."
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Se imprimirá al final del ticket. Puedes usar saltos de línea.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Panel derecho: Vista previa ── */}
                <div className="space-y-4">
                    <Card className="sticky top-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Eye className="w-4 h-4 text-primary" />
                                Vista Previa en Tiempo Real
                            </CardTitle>
                            <CardDescription>
                                Se actualiza automáticamente al cambiar cualquier opción.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center overflow-auto">
                            <div className="py-2">
                                <ReceiptPreview settings={settings} />
                            </div>
                        </CardContent>
                        <div className="px-6 pb-4">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
