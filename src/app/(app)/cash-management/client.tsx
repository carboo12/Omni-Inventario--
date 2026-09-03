
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCashRegisterSessions } from '@/hooks/use-cash-register-sessions';
import { format, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileDown, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ManagedUser } from '@/lib/types';


const formatCurrency = (amount: number) => {
  return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const getStatusVariant = (status: 'open' | 'closed') => {
  switch (status) {
    case 'open':
      return 'default';
    case 'closed':
      return 'secondary';
    default:
      return 'outline';
  }
};

interface CashManagementClientProps {
  initialUsers: any[];
}

export default function CashManagementClient({ initialUsers }: CashManagementClientProps) {
  const { user } = useAuth();
  const { sessions } = useCashRegisterSessions();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [cashierId, setCashierId] = useState<string>('all');

  const cashiers: ManagedUser[] = useMemo(() =>
    (initialUsers as ManagedUser[]).filter(u => u.role === 'cashier' && u.status === 'activo')
    , [initialUsers]);

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Filter by cashier based on role
    if (user?.role === 'cashier') {
      // Cashiers can only see their own sessions
      filtered = filtered.filter(s => s.cashierId === user.id);
    } else if (cashierId !== 'all') {
      // Admins can filter by any cashier
      filtered = filtered.filter(s => s.cashierId === cashierId);
    }

    // Filter by date
    if (date) {
      filtered = filtered.filter(s => {
        try {
          return isSameDay(parseISO(s.openingTime), date);
        } catch (e) {
          return false;
        }
      });
    }

    return filtered.sort((a, b) => {
      try {
        return parseISO(b.openingTime).getTime() - parseISO(a.openingTime).getTime()
      } catch (e) {
        return 0;
      }
    });

  }, [sessions, date, cashierId, user]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Gestión de Cajas</h1>
        <p className="text-muted-foreground">
          Supervise el estado y los movimientos de todas las cajas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Sesiones de Caja</CardTitle>
              <CardDescription>Historial de aperturas y cierres de caja.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {user?.role !== 'cashier' && (
                <Select value={cashierId} onValueChange={setCashierId}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filtrar por cajero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Cajeros</SelectItem>
                    {cashiers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Fecha Apertura</TableHead>
                  <TableHead>Hora Apertura</TableHead>
                  <TableHead>Monto Inicial</TableHead>
                  <TableHead>Hora Cierre</TableHead>
                  <TableHead>Monto Final</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.cashierName}</TableCell>
                      <TableCell>{format(parseISO(session.openingTime), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(parseISO(session.openingTime), 'hh:mm a', { locale: es })}</TableCell>
                      <TableCell>{formatCurrency(session.initialAmount)}</TableCell>
                      <TableCell>
                        {session.closingTime ? format(parseISO(session.closingTime), 'hh:mm a', { locale: es }) : '-'}
                      </TableCell>
                      <TableCell>
                        {session.finalAmount ? formatCurrency(session.finalAmount) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(session.status)}
                          className={cn(session.status === 'open' && 'bg-green-100 text-green-800 border-green-200')}
                        >
                          {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron sesiones para los filtros seleccionados.
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
