"use client";

import React, { useState } from 'react';
import type { PurchaseInvoice, Supplier, PurchaseOrder } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlusCircle, Search, FileText, ShoppingCart, Wallet, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from '@/lib/router-nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useCashRegister } from '@/hooks/use-cash-register';
import { recordSupplierPayment } from '@/lib/actions/purchases';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Pendiente':
    case 'Pending':
      return 'destructive';
    case 'Pagada Parcialmente':
    case 'Ordered':
      return 'default';
    case 'Pagada':
    case 'Received':
      return 'secondary';
    case 'Cancelled':
      return 'outline';
    default:
      return 'outline';
  }
};

const formatCurrency = (amount: number) => {
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PurchasesClientProps {
  initialInvoices: PurchaseInvoice[];
  initialSuppliers: Supplier[];
  initialOrders: PurchaseOrder[];
}

export default function PurchasesClient({ initialInvoices, initialSuppliers, initialOrders }: PurchasesClientProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(initialInvoices);
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<PurchaseInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isPaying, setIsPaying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeSession } = useCashRegister();

  const handleOpenPay = (invoice: PurchaseInvoice) => {
    setPayingInvoice(invoice);
    setPaymentAmount(Math.max(0, invoice.totalAmount - invoice.paidAmount));
    setPaymentMethod('Efectivo');
  };

  const handlePayInvoice = async () => {
    if (!payingInvoice) return;
    if (paymentAmount <= 0) {
      toast({ title: 'Error', description: 'Ingrese un monto mayor a 0.', variant: 'destructive' });
      return;
    }
    setIsPaying(true);
    const result = await recordSupplierPayment({
      invoiceId: payingInvoice.id,
      amount: paymentAmount,
      paymentMethod,
      sessionId: activeSession?.id,
      userId: user?.id,
      notes: undefined,
    });
    setIsPaying(false);
    if (result.success) {
      setInvoices(prev => prev.map(inv =>
        inv.id === payingInvoice.id
          ? { ...inv, paidAmount: inv.paidAmount + paymentAmount, status: (inv.paidAmount + paymentAmount) >= inv.totalAmount ? 'Pagada' : 'Pagada Parcialmente' }
          : inv
      ));
      toast({ title: 'Pago Registrado', description: `Se registró un pago de ${formatCurrency(paymentAmount)}.` });
      setPayingInvoice(null);
    } else {
      toast({ title: 'Error', description: result.error || 'No se pudo registrar el pago.', variant: 'destructive' });
    }
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (order) =>
      order.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Compras y Pedidos</h1>
        <p className="text-muted-foreground">
          Gestione facturas de compra y pedidos a proveedores.
        </p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Cuentas por Pagar</CardTitle>
                  <CardDescription>Facturas pendientes y pagadas a proveedores.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar factura..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:max-w-xs pl-8"
                    />
                  </div>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/purchases/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Registrar Compra
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Factura</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Monto Total</TableHead>
                      <TableHead className="text-right">Monto Pagado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="cursor-pointer">
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.supplierName}</TableCell>
                          <TableCell>{invoice.date}</TableCell>
                          <TableCell>{invoice.dueDate}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.paidAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(invoice.totalAmount - invoice.paidAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {(invoice.status !== 'Pagada' && (invoice.totalAmount - invoice.paidAmount) > 0) && (
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleOpenPay(invoice)}>
                                <Wallet className="h-4 w-4" />
                                Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No se encontraron facturas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Pedidos a Proveedores</CardTitle>
                  <CardDescription>Gestione sus órdenes de compra.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pedido..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:max-w-xs pl-8"
                    />
                  </div>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/purchases/orders/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nuevo Pedido
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pedido</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Entrega Estimada</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id} className="cursor-pointer">
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.supplier?.name || 'Desconocido'}</TableCell>
                          <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                          <TableCell>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No se encontraron pedidos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!payingInvoice} onOpenChange={(open) => { if (!open) setPayingInvoice(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Pagar Factura
            </DialogTitle>
            <DialogDescription>
              Registre un abono a la factura {payingInvoice?.invoiceNumber} de {payingInvoice?.supplierName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Saldo Pendiente:</span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(payingInvoice ? payingInvoice.totalAmount - payingInvoice.paidAmount : 0)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Monto a Pagar (C$)</Label>
              <Input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="h-12 text-xl font-black text-primary"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'Efectivo' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('Efectivo')}
                  className="h-12 font-bold"
                >
                  EFECTIVO
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'Transferencia' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('Transferencia')}
                  className="h-12 font-bold"
                >
                  TRANSFERENCIA
                </Button>
              </div>
            </div>
            {!activeSession && (
              <p className="text-xs text-amber-600">
                No hay una caja abierta. El pago se registrará sin afectar el arqueo.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingInvoice(null)}>Cancelar</Button>
            <Button onClick={handlePayInvoice} disabled={isPaying || paymentAmount <= 0} className="bg-green-600 hover:bg-green-700">
              {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
