'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/lib/router-nav';
import { ArrowLeft, CreditCard, Truck, Printer, ShoppingCart, CalendarDays, User } from 'lucide-react';
import Link from '@/lib/router-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { updateOrderStatus, queueOrderForPOS } from '@/lib/actions/orders';
import { registerPayment } from '@/lib/actions/collections';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pendiente', variant: 'outline' },
  APPROVED: { label: 'Aprobado', variant: 'secondary' },
  IN_TRANSIT: { label: 'En Tránsito', variant: 'default' },
  DELIVERED: { label: 'Entregado', variant: 'default' },
  FACTURADO: { label: 'Facturado', variant: 'secondary' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
};

export default function OrderDetailClient({ order }: { order: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');

  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/orders"><Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Pedido no encontrado.</p></CardContent></Card>
      </div>
    );
  }

  const st = statusLabels[order.status] || { label: order.status, variant: 'outline' as const };
  const remaining = order.totalAmount - order.paidAmount;

  const handleStatusChange = async (newStatus: string) => {
    const result = await updateOrderStatus(order.id, newStatus);
    if (result.success) {
      toast({ title: 'Estado actualizado' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handlePayment = async () => {
    if (payAmount <= 0) {
      toast({ title: 'Error', description: 'Ingrese un monto válido.', variant: 'destructive' });
      return;
    }
    const result = await registerPayment({ orderId: order.id, amount: payAmount, paymentMethod: payMethod, notes: payNote });
    if (result.success) {
      toast({ title: 'Pago registrado', description: `C$${payAmount.toFixed(2)} cobrados.` });
      setPayAmount(0);
      setPayNote('');
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const { settings } = useSettings();
  const [printReady, setPrintReady] = useState(false);
  const [loadingPOS, setLoadingPOS] = useState(false);

  const handleLoadToPOS = async () => {
    setLoadingPOS(true);
    try {
      const res = await queueOrderForPOS(order.id);
      if (!res.success) {
        toast({ title: 'No se pudo cargar en POS', description: (res as any).error || 'Error desconocido', variant: 'destructive' });
        return;
      }
      // Prepara el preload local para que el POS del cajero actual quede listo
      // para facturar, además de quedar disponible en la cola global.
      try {
        sessionStorage.setItem('pos-preload-order', JSON.stringify({
          order,
          heldSale: (res as any).data,
          cartItems: (res as any).cartItems || [],
        }));
      } catch { /* ignore */ }
      router.push('/pos');
    } finally {
      setLoadingPOS(false);
    }
  };

  const triggerPrint = () => {
    setPrintReady(true);
    setTimeout(() => window.print(), 250);
  };

  useEffect(() => {
    if (!printReady) return;
    const onAfterPrint = () => setPrintReady(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, [printReady]);

  const printLayer = printReady ? createPortal(
    <>
      <style>{`
@media print {
  body * { visibility: hidden !important; }
  .order-print-area, .order-print-area * { visibility: visible !important; }
  .order-print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
  }
  @page { size: auto; margin: 0 !important; }
}
.prt-page {
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #111;
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 28px;
}
.prt-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 3px double #111;
  padding-bottom: 12px;
  margin-bottom: 14px;
}
.prt-brand .prt-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
.prt-brand .prt-subtitle { font-size: 12px; color: #555; margin-top: 2px; }
.prt-meta { text-align: right; font-size: 12px; line-height: 1.6; }
.prt-meta-row span { color: #777; margin-right: 6px; }
.prt-cust { border: 1px solid #ccc; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
.prt-cust-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700; }
.prt-cust-name { font-size: 15px; font-weight: 700; }
.prt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 14px; }
.prt-table th { background: #f3f3f3; border: 1px solid #bbb; padding: 7px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
.prt-table td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
.prt-num { width: 28px; text-align: center; }
.prt-qty { width: 60px; text-align: center; }
.prt-price { width: 90px; text-align: right; }
.prt-total { width: 100px; text-align: right; font-weight: 600; }
.prt-totals { margin-left: auto; width: 260px; margin-bottom: 14px; }
.prt-tot-row { display: flex; justify-content: space-between; padding: 4px 6px; font-size: 13px; }
.prt-grand { border-top: 2px solid #111; font-weight: 800; font-size: 15px; padding-top: 6px; margin-top: 4px; }
.prt-notes { border: 1px dashed #bbb; border-radius: 6px; padding: 10px 12px; margin-bottom: 26px; font-size: 13px; }
.prt-sign { display: flex; gap: 40px; justify-content: space-between; margin-bottom: 34px; }
.prt-sign-box { flex: 1; border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 12px; color: #666; }
.prt-footer { text-align: center; border-top: 1px solid #ddd; padding-top: 10px; font-size: 12px; color: #666; }
.prt-footer-sub { font-size: 10px; color: #999; margin-top: 3px; }
`}</style>
    <div className="order-print-area">
      <div className="prt-page">
        <div className="prt-head">
          <div className="prt-brand">
            <div className="prt-title">NOTA DE PEDIDO</div>
            <div className="prt-subtitle">{settings?.ticketHeader?.name || 'PEDIDO'}</div>
            {settings?.ticketHeader?.address && <div className="prt-subtitle">{settings.ticketHeader.address}</div>}
            {(settings?.ticketHeader?.phone || settings?.ticketHeader?.rfc) && <div className="prt-subtitle">Tel: {settings.ticketHeader.phone || '—'} · RUC: {settings.ticketHeader.rfc || '—'}</div>}
          </div>
          <div className="prt-meta">
            <div className="prt-meta-row"><span>Documento:</span><strong>P-{order.code || order.id}</strong></div>
            <div className="prt-meta-row"><span>Fecha:</span><strong>{new Date(order.createdAt).toLocaleDateString('es-NI')}</strong></div>
            <div className="prt-meta-row"><span>Hora:</span><strong>{new Date(order.createdAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div className="prt-meta-row"><span>Estado:</span><strong>{statusLabels[order.status]?.label || order.status}</strong></div>
          </div>
        </div>

        <div className="prt-cust">
          <div className="prt-cust-label">Cliente / Empresa</div>
          <div className="prt-cust-name">{order.customer?.fullName || 'Cliente General'}</div>
          {order.customer?.phone && <div>Tel: {order.customer.phone}</div>}
          {order.customer?.address && <div>Dir: {order.customer.address}</div>}
        </div>

        <table className="prt-table">
          <thead>
            <tr>
              <th className="prt-num">#</th>
              <th>Descripción</th>
              <th className="prt-qty">Cant.</th>
              <th className="prt-price">P. Unit.</th>
              <th className="prt-total">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((it: any, i: number) => (
              <tr key={i}>
                <td className="prt-num">{i + 1}</td>
                <td>{it.productName}</td>
                <td className="prt-qty">{it.quantity}</td>
                <td className="prt-price">{Number(it.unitPrice).toFixed(2)}</td>
                <td className="prt-total">{Number(it.totalPrice || it.unitPrice * it.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="prt-totals">
          <div className="prt-tot-row"><span>Subtotal</span><span>C$ {order.totalAmount.toFixed(2)}</span></div>
          <div className="prt-tot-row"><span>Pagado</span><span>C$ {(order.paidAmount || 0).toFixed(2)}</span></div>
          <div className="prt-tot-row prt-grand"><span>Saldo</span><span>C$ {(order.totalAmount - (order.paidAmount || 0)).toFixed(2)}</span></div>
        </div>

        {order.notes && (
          <div className="prt-notes">
            <div className="prt-cust-label">Observaciones</div>
            <div>{order.notes}</div>
          </div>
        )}

        <div className="prt-sign">
          <div className="prt-sign-box">Firma y Sello del Vendedor</div>
          <div className="prt-sign-box">Recibí Conforme</div>
        </div>

        <div className="prt-footer">
          {settings?.ticketFooter?.message && <div>{settings.ticketFooter.message}</div>}
          {settings?.ticketFooter?.website && <div className="prt-footer-sub">{settings.ticketFooter.website}</div>}
        </div>
      </div>
    </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-7xl mx-auto px-1 md:px-2">
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/orders">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-2xl font-headline font-bold tracking-tight">
              Pedido #{String(order.orderNumber).padStart(5, '0')}
            </h1>
            <Badge variant={st.variant} className="text-xs px-2 py-0.5">{st.label}</Badge>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm truncate">
            {order.customer?.fullName} — {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={triggerPrint} title="Imprimir Nota de Pedido">
            <Printer className="h-4 w-4 md:mr-1.5" /><span className="hidden md:inline">Imprimir</span>
          </Button>
          <Button size="sm" onClick={handleLoadToPOS} disabled={loadingPOS || order.status === 'FACTURADO'} title="Cargar el pedido en el POS para facturar">
            <ShoppingCart className="h-4 w-4 md:mr-1.5" />
            <span className="hidden md:inline">{loadingPOS ? 'Cargando...' : (order.status === 'FACTURADO' ? 'Facturado' : 'Cargar en POS')}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda (2/3): cabecera + productos + pagos */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{order.customer?.fullName || 'Cliente General'}</span></p>
                {order.customer?.phone && <p className="text-muted-foreground pl-6">Tel: {order.customer.phone}</p>}
                {order.customer?.address && <p className="text-muted-foreground pl-6">Dir: {order.customer.address}</p>}
              </div>
              <div className="space-y-1.5 text-sm sm:text-right">
                <p className="flex items-center gap-2 sm:justify-end"><CalendarDays className="h-4 w-4 text-muted-foreground" />{new Date(order.createdAt).toLocaleString()}</p>
                <p className="text-muted-foreground sm:pl-6">Tomado por: {order.user?.name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Productos</CardTitle>
              <CardDescription>{order.items?.length || 0} artículo(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">#</th>
                      <th className="px-4 py-2.5 font-semibold">Descripción</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Presentación</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Cantidad</th>
                      <th className="px-4 py-2.5 font-semibold text-right">P. Unitario</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">-</td>
                        <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right">C${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">C${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total del Pedido</span>
                  <span className="text-base font-bold">C${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2 font-semibold">Fecha</th>
                        <th className="pb-2 font-semibold">Método</th>
                        <th className="pb-2 font-semibold">Usuario</th>
                        <th className="pb-2 font-semibold text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.payments.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2">{new Date(p.receivedAt).toLocaleString()}</td>
                          <td className="py-2 capitalize">{p.paymentMethod}</td>
                          <td className="py-2">{p.user?.name || '-'}</td>
                          <td className="py-2 text-right font-semibold">C${p.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
              )}
              <Separator className="my-3" />
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Pagado: <span className="font-semibold text-foreground">C${order.paidAmount.toFixed(2)}</span></span>
                <span className="font-bold text-destructive">Pendiente: C${remaining.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {order.routeStops?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />Ruta de Reparto</CardTitle>
              </CardHeader>
              <CardContent>
                {order.routeStops.map((stop: any) => (
                  <div key={stop.id} className="flex items-center gap-2 text-sm py-1">
                    <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{stop.route?.name || 'Ruta'}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Notas</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{order.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha (1/3): acciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cambiar Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleStatusChange} defaultValue={order.status}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="APPROVED">Aprobado</SelectItem>
                  <SelectItem value="IN_TRANSIT">En Tránsito</SelectItem>
                  <SelectItem value="DELIVERED">Entregado</SelectItem>
                  <SelectItem value="FACTURADO">Facturado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {remaining > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Registrar Pago</CardTitle>
                <CardDescription>Saldo pendiente: C${remaining.toFixed(2)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">Monto</Label>
                  <Input type="number" min={0} step={0.01} value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Método</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Nota (opcional)</Label>
                  <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="..." />
                </div>
                <Button className="w-full" onClick={handlePayment}><CreditCard className="mr-2 h-4 w-4" />Cobrar C${payAmount.toFixed(2)}</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Info del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p><span className="text-muted-foreground">Nombre:</span> {order.customer?.fullName}</p>
              {order.customer?.phone && <p><span className="text-muted-foreground">Tel:</span> {order.customer.phone}</p>}
              {order.customer?.address && <p><span className="text-muted-foreground">Dir:</span> {order.customer.address}</p>}
              <p className="text-muted-foreground pt-2 text-xs">Tomado por: {order.user?.name}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      {printLayer}
    </div>
  );
}
