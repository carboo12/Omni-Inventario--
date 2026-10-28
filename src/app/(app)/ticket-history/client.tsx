'use client';

import { useEffect, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PrintFormatToggle } from '@/components/pos/print-format-toggle';
import { useSettings } from '@/hooks/use-settings';
import { useReceiptSettings } from '@/hooks/use-receipt-settings';
import { buildReceiptDataFromInvoice } from '@/lib/ticket-data';
import { buildReceiptHtml, printReceiptHtml } from '@/lib/print-iframe';
import { buildA4ReceiptHtml, printA4Html } from '@/lib/print-a4';
import { useToast } from '@/hooks/use-toast';
import { getPreferredPrintFormat, type PrintFormat } from '@/lib/print-format';
import { formatTicketNumber } from '@/lib/utils';
import { getInvoiceByNumber } from '@/lib/actions/sales';
import { getTicketHistory } from '@/lib/actions/reports';
import { InvoiceA4Template } from '@/components/pos/invoice-a4-template';
import { ReceiptTemplate } from '@/components/pos/receipt-template';

type InvoiceRow = {
  id: string;
  invoiceNumber: number;
  date: string;
  totalAmount: number;
  customerName?: string | null;
  customer?: { fullName?: string | null } | null;
  user?: { name?: string | null } | null;
};

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export default function TicketHistoryClient() {
  const { settings } = useSettings();
  const receiptSettings = useReceiptSettings();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<PrintFormat>('ticket');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => setPrintFormat(getPreferredPrintFormat()), []);

  const runSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const result = await getTicketHistory(startDate, endDate);
      if (result?.success && Array.isArray(result.data)) setRows(result.data);
      else {
        setRows([]);
        toast({ title: 'No se pudo realizar la búsqueda', description: result?.error || 'Intenta de nuevo.', variant: 'destructive' });
      }
    } catch (error) {
      setRows([]);
      toast({ title: 'Error de búsqueda', description: error instanceof Error ? error.message : 'No se pudieron consultar los tickets.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const prepareInvoice = (invoice: any) => buildReceiptDataFromInvoice(invoice, {
    ticketHeader: settings.ticketHeader,
    ticketFooter: settings.ticketFooter,
    logoSvg: settings.logoSvg,
    exchangeRate: settings.exchangeRate,
  }, formatTicketNumber(invoice.invoiceNumber));

  const printInvoice = (invoice: any, format: PrintFormat) => {
    const receiptData = { ...prepareInvoice(invoice), isReprint: true };
    if (format === 'invoice') printA4Html(buildA4ReceiptHtml(receiptData));
    else printReceiptHtml(buildReceiptHtml(receiptData, receiptSettings));
  };

  const reprint = async (row: InvoiceRow) => {
    setPrintingId(row.id);
    try {
      const result = await getInvoiceByNumber(row.invoiceNumber);
      if (!result?.success || !result.data) throw new Error(result?.error || 'No se encontró la factura.');
      setPreviewInvoice(result.data);
      setPreviewLoading(false);
      setPrintingId(null);
    } catch (error) {
      setPrintingId(null);
      setPreviewLoading(false);
      toast({ title: 'No se pudo reimprimir', description: error instanceof Error ? error.message : 'Error al cargar el ticket.', variant: 'destructive' });
    }
  };

  const printPreview = () => {
    if (!previewInvoice) return;
    const invoiceToPrint = previewInvoice;
    const selectedFormat = printFormat;

    // Cerrar y desmontar el Dialog antes de window.print() (dentro del iframe
    // A4). Chrome bloquea el hilo mientras muestra su diálogo nativo; abrirlo
    // con el focus trap de Radix todavía montado puede dejar la pantalla modal.
    setPreviewInvoice(null);
    setPreviewLoading(false);
    if (selectedFormat === 'invoice') {
      window.setTimeout(() => printInvoice(invoiceToPrint, selectedFormat), 300);
      return;
    }
    printInvoice(invoiceToPrint, selectedFormat);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Historial y Búsqueda de Tickets</h1>
        <p className="text-sm text-muted-foreground">Localiza facturas emitidas y reimprime el comprobante original.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Filtros de búsqueda</CardTitle><CardDescription>Por defecto se consulta el día de hoy.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); void runSearch(); }}>
            <div className="space-y-2"><Label htmlFor="ticket-start">Fecha inicio</Label><Input id="ticket-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="ticket-end">Fecha fin</Label><Input id="ticket-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <Button type="submit" disabled={loading}><Search className="mr-2 h-4 w-4" />{loading ? 'Buscando…' : 'Buscar por Fechas'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Facturas emitidas</CardTitle><CardDescription>{hasSearched ? `${rows.length} resultado(s)` : 'Usa los filtros para buscar tickets.'}</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>N° Ticket/Factura</TableHead><TableHead>Fecha y hora</TableHead><TableHead>Cliente</TableHead><TableHead>Cajero/Despachador</TableHead><TableHead>Total (C$)</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map(row => <TableRow key={row.id}>
                  <TableCell className="font-mono">#{formatTicketNumber(row.invoiceNumber)}</TableCell>
                  <TableCell>{new Date(row.date).toLocaleString()}</TableCell>
                  <TableCell>{row.customer?.fullName || row.customerName || 'Cliente Genérico'}</TableCell>
                  <TableCell>{row.user?.name || '—'}</TableCell>
                  <TableCell className="font-semibold">C${Number(row.totalAmount || 0).toFixed(2)}</TableCell>
                  <TableCell><Button size="sm" variant="outline" disabled={loading || printingId === row.id} onClick={() => void reprint(row)}><Printer className="mr-2 h-4 w-4" />{printingId === row.id ? 'Cargando…' : 'Reimprimir Ticket'}</Button></TableCell>
                </TableRow>)}
                {hasSearched && rows.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron facturas en ese rango.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewInvoice} onOpenChange={open => { if (!open) { setPreviewInvoice(null); setPreviewLoading(false); } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Vista previa de reimpresión</DialogTitle></DialogHeader>
          <PrintFormatToggle value={printFormat} onChange={setPrintFormat} />
          {previewLoading && <div className="py-10 text-center text-sm text-muted-foreground">Cargando vista previa…</div>}
          {previewInvoice && <div className="max-h-[65vh] overflow-auto rounded border bg-muted/30 p-4"><p className="mb-3 text-center text-xs text-muted-foreground">La impresión incluirá la leyenda REIMPRESIÓN.</p>{printFormat === 'invoice' ? <InvoiceA4Template {...{ ...prepareInvoice(previewInvoice), isReprint: true }} previewMode /> : <ReceiptTemplate {...{ ...prepareInvoice(previewInvoice), isReprint: true }} previewMode />}</div>}
          <div className="flex justify-end"><Button onClick={printPreview} disabled={!previewInvoice || previewLoading}><Printer className="mr-2 h-4 w-4" />Reimprimir</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
