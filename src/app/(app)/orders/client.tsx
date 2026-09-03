'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from '@/lib/router-nav';
import { useRouter } from '@/lib/router-nav';
import { PlusCircle, Search, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/actions/orders';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pendiente', variant: 'outline' },
  APPROVED: { label: 'Aprobado', variant: 'secondary' },
  IN_TRANSIT: { label: 'En Tránsito', variant: 'default' },
  DELIVERED: { label: 'Entregado', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
};

function OrderCard({ order }: { order: any }) {
  const st = statusLabels[order.status] || { label: order.status, variant: 'outline' as const };
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <div className="rounded-lg border bg-card p-3 active:bg-accent transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-bold">#{String(order.orderNumber).padStart(5, '0')}</span>
          <Badge variant={st.variant} className="text-[10px] px-1.5 py-0">{st.label}</Badge>
        </div>
        <p className="text-sm font-medium truncate">{order.customer?.fullName || 'N/A'}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-primary">C${order.totalAmount.toFixed(2)}</span>
            {order.paidAmount > 0 && (
              <span className="text-[10px] text-muted-foreground">Pagado: C${order.paidAmount.toFixed(2)}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
            <span className="text-[10px] text-muted-foreground">{order.user?.name || 'N/A'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OrdersClient({ initialOrders }: { initialOrders?: any[] }) {
  const router = useRouter();
  const { mode, loading: modeLoading } = useBusinessMode();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const result = await getOrders();
      return result.success ? (result.data as any[]) : [];
    },
    initialData: initialOrders,
    enabled: !modeLoading && mode === 'DISTRIBUIDORA',
  });
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!modeLoading && mode !== 'DISTRIBUIDORA') {
      router.replace('/dashboard');
    }
  }, [modeLoading, mode, router]);

  if (modeLoading || mode !== 'DISTRIBUIDORA') {
    return null;
  }

  const filtered = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter((o: any) =>
      o.customer?.fullName?.toLowerCase().includes(q) ||
      `#${o.orderNumber}`.includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-headline font-bold tracking-tight md:text-3xl">Pedidos</h1>
          {!isMobile && <p className="text-muted-foreground text-sm">Gestión de pedidos de clientes.</p>}
        </div>
        <Link href="/orders/new">
          <Button className="h-10 md:h-10" size={isMobile ? 'default' : 'default'}>
            {isMobile ? <PlusCircle className="h-5 w-5" /> : <><PlusCircle className="mr-2 h-4 w-4" />Nuevo Pedido</>}
          </Button>
        </Link>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente o # pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-12 md:h-10 text-sm"
        />
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{isLoading ? 'Cargando pedidos...' : 'No hay pedidos registrados.'}</div>
          ) : (
            filtered.map((order: any) => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Pedidos</CardTitle>
                <CardDescription>{filtered.length} pedidos registrados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead># Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tomado por</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order: any) => {
                    const st = statusLabels[order.status] || { label: order.status, variant: 'outline' as const };
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{String(order.orderNumber).padStart(5, '0')}</TableCell>
                        <TableCell>{order.customer?.fullName || 'N/A'}</TableCell>
                        <TableCell>C${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>C${order.paidAmount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{order.user?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center">{isLoading ? 'Cargando pedidos...' : 'No hay pedidos registrados.'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
