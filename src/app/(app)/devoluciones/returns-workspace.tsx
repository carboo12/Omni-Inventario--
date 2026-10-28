'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditNoteDialog } from '@/components/pos/credit-note-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { getCreditNotes } from '@/lib/actions-client/credit-notes';
import { useToast } from '@/hooks/use-toast';

export default function ReturnsWorkspace() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { toast } = useToast();

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getCreditNotes(100);
      if (!result?.success) {
        setLoadError(result?.error || 'No se pudo cargar el historial.');
        return false;
      }
      setNotes(Array.isArray(result.data) ? result.data : []);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de comunicación con el servidor.';
      setLoadError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotes(); }, [loadNotes]);

  const handleSuccess = async (creditNote?: any) => {
    setOpen(false);
    const historyLoaded = await loadNotes();
    toast({
      title: historyLoaded ? 'Devolución registrada' : 'Devolución guardada',
      description: historyLoaded
        ? `Nota #${creditNote?.noteNumber ?? ''} guardada y visible en el historial.`
        : `Nota #${creditNote?.noteNumber ?? ''} guardada; no se pudo refrescar el historial. Intente actualizar.`,
      variant: historyLoaded ? 'default' : 'destructive',
    });
  };

  const formatMoney = (amount: number) => `C$ ${Number(amount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (value: string | Date) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-NI');
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6">
    <Card><CardHeader><CardTitle>Devoluciones y garantías</CardTitle><CardDescription>Consulte notas guardadas o registre una devolución parcial o total.</CardDescription></CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{notes.length} devolución(es) registrada(s)</p><div className="flex gap-2"><Button variant="outline" onClick={() => void loadNotes()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button><Button onClick={() => setOpen(true)}><RotateCcw className="mr-2 h-4 w-4" />Registrar devolución</Button></div></CardContent>
    </Card>

    <Card><CardHeader><CardTitle>Historial de devoluciones</CardTitle><CardDescription>Notas de crédito procesadas por caja y administración.</CardDescription></CardHeader><CardContent>
      {loading ? <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando devoluciones…</div>
        : loadError ? <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"><p className="font-medium text-destructive">No se pudo cargar el historial</p><p className="text-sm">{loadError}</p><Button variant="outline" onClick={() => void loadNotes()}>Reintentar</Button></div>
          : notes.length === 0 ? <div className="rounded-md border border-dashed p-10 text-center"><p className="font-medium">Todavía no hay devoluciones registradas.</p><p className="mt-1 text-sm text-muted-foreground">Las notas guardadas aparecerán aquí.</p></div>
            : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/60"><tr>{['Nota', 'Factura', 'Fecha y hora', 'Cliente', 'Cajero', 'Productos', 'Total', 'Motivo'].map((heading) => <th key={heading} className="px-3 py-3 text-left font-semibold">{heading}</th>)}</tr></thead><tbody>{notes.map((note) => <tr key={note.id} className="border-t"><td className="px-3 py-3"><Badge variant="secondary">#{note.noteNumber}</Badge></td><td className="px-3 py-3">#{note.invoiceNumber}</td><td className="px-3 py-3">{formatDate(note.date)}</td><td className="px-3 py-3">{note.customerName || 'Cliente General'}</td><td className="px-3 py-3">{note.cashierName || 'Caja'}</td><td className="px-3 py-3">{(note.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)}</td><td className="px-3 py-3 font-semibold">{formatMoney(note.totalAmount)}</td><td className="max-w-[220px] truncate px-3 py-3" title={note.reason}>{note.reason}</td></tr>)}</tbody></table></div>}
    </CardContent></Card>

    <CreditNoteDialog isOpen={open} onClose={() => setOpen(false)} onSuccess={handleSuccess} />
  </div>;
}
