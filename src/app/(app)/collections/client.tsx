'use client';

import React, { useState, useMemo } from 'react';
import { Search, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const methodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

export default function CollectionsClient({ initialCollections }: { initialCollections: any[] }) {
  const [collections] = useState(initialCollections);
  const [search, setSearch] = useState('');

  const totalAmount = useMemo(() => {
    return collections.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  }, [collections]);

  const filtered = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter((c: any) =>
      c.order?.customer?.fullName?.toLowerCase().includes(q) ||
      c.paymentMethod.toLowerCase().includes(q) ||
      c.reference?.toLowerCase().includes(q)
    );
  }, [collections, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Cobros</h1>
        <p className="text-muted-foreground text-sm">Registro de cobros realizados a clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cobrado</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">C${totalAmount.toFixed(2)}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Transacciones</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold">{collections.length}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Promedio por Cobro</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              C${collections.length > 0 ? (totalAmount / collections.length).toFixed(2) : '0.00'}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Cobros</CardTitle>
              <CardDescription>{filtered.length} cobros registrados.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente o método..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">#{String(c.order?.orderNumber || '').padStart(5, '0')}</TableCell>
                    <TableCell>{c.order?.customer?.fullName || '—'}</TableCell>
                    <TableCell className="font-medium">C${Number(c.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline">{methodLabels[c.paymentMethod] || c.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.reference || '—'}</TableCell>
                    <TableCell className="text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay cobros registrados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
