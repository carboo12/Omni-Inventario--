'use client';

import React, { useState, useMemo } from 'react';
import Link from '@/lib/router-nav';
import { Truck, Search, Printer, CheckCircle2, Clock, MapPin, Phone, DollarSign, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { confirmDeliveryAndPayment, updateInvoiceDeliveryStatus } from '@/lib/actions-client/sales';
import { useRouter } from '@/lib/router-nav';
import { printA4Html, buildA4ReceiptHtml } from '@/lib/print-a4';
import { printReceiptHtml, buildReceiptHtml } from '@/lib/print-iframe';
import { useSettings } from '@/hooks/use-settings';
import { PrintFormatToggle } from '@/components/pos/print-format-toggle';
import type { PrintFormat } from '@/lib/print-format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeliveryRoutePageClientProps {
    invoices?: any[];
}

const statusBadgeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    PENDIENTE_ENTREGA: { label: 'Listo p/ Ruta', variant: 'outline' },
    EN_RUTA: { label: 'En Ruta', variant: 'default' },
    ENTREGADO: { label: 'Entregado', variant: 'secondary' },
    COBRADO: { label: 'Entregado & Cobrado', variant: 'secondary' },
    CANCELADO: { label: 'Cancelado', variant: 'destructive' },
};

export default function DeliveryRouteClient({ invoices: initialInvoices }: DeliveryRoutePageClientProps) {
    const [invoices, setInvoices] = useState(initialInvoices || []);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [printFormat, setPrintFormat] = useState<PrintFormat>('invoice');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { settings } = useSettings();

    const filtered = useMemo(() => {
        return invoices.filter((inv: any) => {
            const matchesSearch =
                !search ||
                String(inv.invoiceNumber).includes(search) ||
                inv.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                inv.deliveryAddress?.toLowerCase().includes(search.toLowerCase()) ||
                inv.deliveryPhone?.includes(search);

            const matchesStatus =
                statusFilter === 'ALL' ||
                inv.deliveryStatus === statusFilter ||
                (statusFilter === 'PENDING' && (inv.deliveryStatus === 'PENDIENTE_ENTREGA' || inv.deliveryStatus === 'EN_RUTA'));

            return matchesSearch && matchesStatus;
        });
    }, [invoices, search, statusFilter]);

    const handleConfirmDelivery = async (inv: any) => {
        setLoadingId(inv.id);
        try {
            const result = await confirmDeliveryAndPayment(inv.id);
            if (result.success) {
                toast({
                    title: '¡Entrega y Cobro Confirmado!',
                    description: `Pedido #${inv.invoiceNumber} marcado como entregado/cobrado. C$${inv.totalAmount.toFixed(2)} ingresados a caja.`,
                });
                setInvoices(prev =>
                    prev.map(item => item.id === inv.id ? { ...item, isPaid: true, deliveryStatus: 'COBRADO' } : item)
                );
                router.refresh();
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Ocurrió un error al confirmar la entrega.', variant: 'destructive' });
        } finally {
            setLoadingId(null);
        }
    };

    const handlePrintInvoice = (inv: any) => {
        const items = (inv.salesInvoiceItem || []).map((item: any) => ({
            quantity: item.quantity,
            description: item.productName || item.product?.name || 'Producto',
            price: item.unitPrice,
            total: item.totalPrice,
            unit: item.presentationName || item.baseUnit || undefined,
            code: item.product?.barcode || undefined,
            priceLevel: item.priceLevel,
        }));

        const receiptData = {
            pharmacyName: settings.ticketHeader?.name || 'OMNI POS',
            address: settings.ticketHeader?.address || '',
            phone: settings.ticketHeader?.phone || '',
            rfc: settings.ticketHeader?.rfc || '',
            ticketId: String(inv.invoiceNumber || inv.id),
            date: inv.date ? new Date(inv.date) : new Date(),
            cashierName: inv.user?.name || 'Repartidor',
            clientName: inv.customer?.fullName || 'Cliente de Contado',
            clientAddress: inv.deliveryAddress || inv.customer?.address || undefined,
            clientPhone: inv.deliveryPhone || inv.customer?.phone || undefined,
            items,
            subtotal: inv.subtotal || inv.totalAmount,
            tax: inv.tax || 0,
            total: inv.totalAmount,
            paymentMethod: inv.paymentMethod || 'Efectivo',
            amountPaid: inv.totalAmount,
            change: 0,
            footerMessage: settings.ticketFooter?.message,
            website: settings.ticketFooter?.website,
            logoSvg: settings.logoSvg,
            exchangeRate: parseFloat(settings.exchangeRate) || 36.5,
            showTotalUSD: true,
            deliveryType: 'route' as 'route',
            deliveryStatus: inv.deliveryStatus,
        };

        if (printFormat === 'invoice') {
            printA4Html(buildA4ReceiptHtml(receiptData));
        } else {
            printReceiptHtml(buildReceiptHtml(receiptData));
        }
    };

    // Imprimir Manifiesto de Ruta (Resumen completo de entregas del día)
    const handlePrintManifest = () => {
        const routeDate = format(new Date(), 'dd/MM/yyyy', { locale: es });
        const pendingTotal = filtered.reduce((sum, inv) => sum + (!inv.isPaid ? inv.totalAmount : 0), 0);
        const grandTotal = filtered.reduce((sum, inv) => sum + inv.totalAmount, 0);

        const manifestRows = filtered.map((inv, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td><strong>#${inv.invoiceNumber}</strong></td>
                <td>
                    <strong>${inv.customer?.fullName || 'Cliente General'}</strong><br/>
                    ${inv.deliveryAddress ? `<small>📍 ${inv.deliveryAddress}</small><br/>` : ''}
                    ${inv.deliveryPhone ? `<small>📞 ${inv.deliveryPhone}</small>` : ''}
                </td>
                <td style="text-align:right;">C$ ${inv.totalAmount.toFixed(2)}</td>
                <td style="text-align:center;">
                    ${inv.isPaid ? '<span style="color:green;font-weight:bold;">PAGADO</span>' : '<span style="color:red;font-weight:bold;">COBRO CONTRA ENTREGA</span>'}
                </td>
                <td style="text-align:center; font-size:11px;">
                    ${inv.deliveryStatus || 'PENDIENTE'}
                </td>
            </tr>
        `).join('');

        const manifestHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="display:flex; justify-between; align-items:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <div>
                        <h1 style="margin:0; text-transform:uppercase; font-size:22px;">${settings.ticketHeader?.name || 'MANIFIESTO DE RUTA'}</h1>
                        <p style="margin:2px 0; color:#555;">Hoja de Despacho y Registro de Entregas</p>
                    </div>
                    <div style="text-align:right;">
                        <h3 style="margin:0;">FECHA: ${routeDate}</h3>
                        <p style="margin:2px 0;">Total Pedidos: ${filtered.length}</p>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:25px;" border="1" cellpadding="6">
                    <thead>
                        <tr style="background:#f0f0f0;">
                            <th style="width:5%;">#</th>
                            <th style="width:12%;">Factura</th>
                            <th style="width:40%;">Cliente / Dirección / Teléfono</th>
                            <th style="width:15%; text-align:right;">Monto</th>
                            <th style="width:15%; text-align:center;">Pago</th>
                            <th style="width:13%; text-align:center;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${manifestRows}
                    </tbody>
                </table>

                <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
                    <div style="border:1px solid #ccc; padding:10px; width:45%;">
                        <p style="margin:0; font-weight:bold;">Resumen Financiero de Ruta:</p>
                        <p style="margin:4px 0;">Total Pendiente por Cobrar: <strong>C$ ${pendingTotal.toFixed(2)}</strong></p>
                        <p style="margin:4px 0;">Monto Total en Manifiesto: <strong>C$ ${grandTotal.toFixed(2)}</strong></p>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; margin-top:60px;">
                    <div style="width:45%; text-align:center;">
                        <div style="border-top:1px solid #000; padding-top:5px; font-weight:bold;">Entregado por (Despachador/Caja)</div>
                    </div>
                    <div style="width:45%; text-align:center;">
                        <div style="border-top:1px solid #000; padding-top:5px; font-weight:bold;">Recibido Conforme (Repartidor)</div>
                    </div>
                </div>
            </div>
        `;

        printA4Html(manifestHtml);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl flex items-center gap-2">
                        <Truck className="h-8 w-8 text-amber-600" />
                        Despacho & Hoja de Ruta
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Control de pedidos para entrega a domicilio, ruteo y cobro contra entrega.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <PrintFormatToggle value={printFormat} onChange={setPrintFormat} />
                    <Button onClick={handlePrintManifest} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                        <Printer className="mr-2 h-4 w-4" /> Manifiesto de Ruta
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">Pedidos Asignados del Día</CardTitle>
                            <CardDescription>{filtered.length} pedidos encontrados.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar pedido, cliente, teléfono..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 text-xs"
                                />
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('ALL')}
                                    className="text-xs"
                                >
                                    Todos
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('PENDING')}
                                    className="text-xs"
                                >
                                    Pendientes
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'COBRADO' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('COBRADO')}
                                    className="text-xs"
                                >
                                    Cobrados
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">No. Factura</TableHead>
                                    <TableHead className="font-bold">Cliente / Teléfono</TableHead>
                                    <TableHead className="font-bold">Dirección de Entrega</TableHead>
                                    <TableHead className="font-bold">Monto / Pago</TableHead>
                                    <TableHead className="font-bold">Estado</TableHead>
                                    <TableHead className="text-right font-bold">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((inv: any) => {
                                    const st = statusBadgeMap[inv.deliveryStatus] || { label: inv.deliveryStatus || 'Pendiente', variant: 'outline' };
                                    const isPaid = inv.isPaid;
                                    return (
                                        <TableRow key={inv.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono font-bold">
                                                #{inv.invoiceNumber}
                                                <div className="text-[10px] text-muted-foreground font-normal">
                                                    {format(new Date(inv.date), 'dd/MM/yyyy HH:mm')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-900">{inv.customer?.fullName || 'Cliente General'}</div>
                                                {inv.deliveryPhone && (
                                                    <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                                        <Phone className="h-3 w-3 text-emerald-600" /> {inv.deliveryPhone}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                <div className="flex items-start gap-1 text-xs text-slate-700">
                                                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                                    <span className="whitespace-pre-line">{inv.deliveryAddress || inv.customer?.address || 'Sin dirección registrada'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-base text-slate-900">C$ {inv.totalAmount.toFixed(2)}</div>
                                                <div className="mt-0.5">
                                                    {isPaid ? (
                                                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            ✓ Pagado ({inv.paymentMethod})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                                                            ⚠️ Cobro contra entrega
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={st.variant}>{st.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePrintInvoice(inv)}
                                                        title="Imprimir Factura (Hoja Normal A4 / Ticket)"
                                                    >
                                                        <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
                                                    </Button>

                                                    {!isPaid && inv.deliveryStatus !== 'COBRADO' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                            disabled={loadingId === inv.id}
                                                            onClick={() => handleConfirmDelivery(inv)}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar Cobro & Entrega
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No hay pedidos asignados a ruta en este momento.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
