'use client';

import React, { useState, useMemo } from 'react';
import Link from '@/lib/router-nav';
import { PlusCircle, Search, Eye, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pendiente', variant: 'outline' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completada', variant: 'secondary' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

export default function DeliveryRoutesClient({ initialRoutes }: { initialRoutes: any[] }) {
  const [routes] = useState(initialRoutes);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return routes;
    const q = search.toLowerCase();
    return routes.filter((r: any) =>
      r.name.toLowerCase().includes(q) ||
      r.rutero?.name?.toLowerCase().includes(q)
    );
  }, [routes, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Rutas de Reparto</h1>
          <p className="text-muted-foreground text-sm">Gestión de rutas y asignación a ruteros.</p>
        </div>
        <Link href="/delivery-routes/new">
          <Button><PlusCircle className="mr-2 h-4 w-4" />Nueva Ruta</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Rutas</CardTitle>
              <CardDescription>{filtered.length} rutas registradas.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar ruta o rutero..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rutero</TableHead>
                  <TableHead>Paradas</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((route: any) => {
                  const st = statusLabels[route.status] || { label: route.status, variant: 'outline' };
                  const visited = route.stops?.filter((s: any) => s.status === 'VISITED').length || 0;
                  const total = route.stops?.length || 0;
                  return (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium"><MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />{route.name}</TableCell>
                      <TableCell>{route.rutero?.name || 'Sin asignar'}</TableCell>
                      <TableCell>{visited}/{total}</TableCell>
                      <TableCell className="text-sm">{new Date(route.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/delivery-routes/${route.id}`}>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay rutas registradas.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
