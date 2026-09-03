'use client';

import React, { useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import Link from '@/lib/router-nav';
import { ArrowLeft, MapPin, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateRouteStatus, updateStopStatus } from '@/lib/actions/delivery-routes';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pendiente', variant: 'outline' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'default' },
  COMPLETED: { label: 'Completada', variant: 'secondary' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

const stopStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  PENDING: { label: 'Pendiente', variant: 'outline' },
  VISITED: { label: 'Visitada', variant: 'default' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

export default function RouteDetailClient({ route }: { route: any }) {
  const router = useRouter();
  const { toast } = useToast();

  if (!route) {
    return (
      <div className="space-y-4">
        <Link href="/delivery-routes"><Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button></Link>
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Ruta no encontrada.</p></CardContent></Card>
      </div>
    );
  }

  const st = statusLabels[route.status] || { label: route.status, variant: 'outline' };

  const handleRouteStatus = async (status: string) => {
    const result = await updateRouteStatus(route.id, status);
    if (result.success) {
      toast({ title: 'Estado de ruta actualizado' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleStopStatus = async (stopId: string, status: string) => {
    const result = await updateStopStatus(stopId, status);
    if (result.success) {
      toast({ title: 'Parada actualizada' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const visited = route.stops?.filter((s: any) => s.status === 'VISITED').length || 0;
  const total = route.stops?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/delivery-routes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-headline font-bold tracking-tight">{route.name}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(route.date).toLocaleDateString()} — {route.rutero?.name || 'Sin rutero asignado'} — {visited}/{total} paradas
          </p>
        </div>
        <Badge variant={st.variant} className="text-sm px-3 py-1">{st.label}</Badge>
      </div>

      <div className="flex gap-2">
        {route.status === 'PENDING' && (
          <Button onClick={() => handleRouteStatus('IN_PROGRESS')}><Clock className="mr-2 h-4 w-4" />Iniciar Ruta</Button>
        )}
        {route.status === 'IN_PROGRESS' && (
          <Button onClick={() => handleRouteStatus('COMPLETED')} variant="secondary"><CheckCircle2 className="mr-2 h-4 w-4" />Completar Ruta</Button>
        )}
        {route.status !== 'CANCELLED' && route.status !== 'COMPLETED' && (
          <Button onClick={() => handleRouteStatus('CANCELLED')} variant="outline" className="text-destructive"><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paradas de la Ruta</CardTitle>
          <CardDescription>{total} paradas en total.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {route.stops?.map((stop: any, idx: number) => {
              const sst = stopStatusLabels[stop.status] || { label: stop.status, variant: 'outline' };
              return (
                <div key={stop.id} className="flex items-start gap-3 border rounded-lg p-4">
                  <div className="mt-0.5">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{stop.customer?.fullName || 'Cliente'}</span>
                      <Badge variant={sst.variant}>{sst.label}</Badge>
                    </div>
                    {stop.address && <p className="text-sm text-muted-foreground">{stop.address}</p>}
                    {stop.order && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pedido #{String(stop.order.orderNumber).padStart(5, '0')} — C${stop.order.totalAmount.toFixed(2)}
                      </p>
                    )}
                    {stop.notes && <p className="text-xs text-muted-foreground mt-1 italic">{stop.notes}</p>}
                    {stop.visitedAt && <p className="text-xs text-muted-foreground mt-1">Visitada: {new Date(stop.visitedAt).toLocaleString()}</p>}
                  </div>
                  {stop.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleStopStatus(stop.id, 'VISITED')}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Visitar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleStopStatus(stop.id, 'CANCELLED')}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {(!route.stops || route.stops.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin paradas en esta ruta.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {route.notes && (
        <Card>
          <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{route.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
