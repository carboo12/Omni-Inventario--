'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/lib/router-nav';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createDeliveryRoute, getRuteros } from '@/lib/actions/delivery-routes';
import { getAllCustomers } from '@/lib/actions/customers';

export default function NewRouteClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [ruteros, setRuteros] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [ruteroId, setRuteroId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stops, setStops] = useState<{ customerId: string; address: string; notes: string }[]>([
    { customerId: '', address: '', notes: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRuteros().then((r) => { if (r.success) setRuteros(r.data || []); });
    getAllCustomers().then((r) => { setCustomers(r || []); });
  }, []);

  const addStop = () => setStops([...stops, { customerId: '', address: '', notes: '' }]);
  const removeStop = (idx: number) => {
    if (stops.length > 1) setStops(stops.filter((_, i) => i !== idx));
  };
  const updateStop = (idx: number, field: string, value: string) => {
    setStops(stops.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Ingrese un nombre para la ruta.', variant: 'destructive' });
      return;
    }
    const validStops = stops.filter((s) => s.customerId);
    if (validStops.length === 0) {
      toast({ title: 'Error', description: 'Agregue al menos una parada con cliente.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const result = await createDeliveryRoute({ name, ruteroId: ruteroId || undefined, date, stops: validStops });
    setSaving(false);

    if (result.success) {
      toast({ title: 'Ruta creada' });
      router.push('/delivery-routes');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Nueva Ruta de Reparto</h1>
        <p className="text-muted-foreground text-sm">Planifique una ruta con paradas y asígnela a un rutero.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Ruta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la Ruta</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ruta Norte - Lunes" />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rutero Asignado (opcional)</Label>
            <Select value={ruteroId} onValueChange={setRuteroId}>
              <SelectTrigger><SelectValue placeholder="Seleccione un rutero" /></SelectTrigger>
              <SelectContent>
                {ruteros.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Paradas</Label>
              <Button variant="outline" size="sm" onClick={addStop}><Plus className="h-4 w-4 mr-1" />Agregar Parada</Button>
            </div>
            {stops.map((stop, idx) => (
              <div key={idx} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Select value={stop.customerId} onValueChange={(v) => updateStop(idx, 'customerId', v)}>
                    <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={stop.address} onChange={(e) => updateStop(idx, 'address', e.target.value)} placeholder="Dirección (opcional)" />
                  <Input value={stop.notes} onChange={(e) => updateStop(idx, 'notes', e.target.value)} placeholder="Notas (opcional)" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeStop(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />{saving ? 'Guardando...' : 'Guardar Ruta'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
