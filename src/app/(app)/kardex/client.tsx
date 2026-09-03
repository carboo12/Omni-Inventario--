"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { InventoryMovement } from '@/lib/types';
import { getKardexReport } from '@/lib/actions-client/kardex';
import type { KardexReportRow } from '@/lib/actions-client/kardex';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Calendar as CalendarIcon, ArrowDown, ArrowUp, ArrowRightLeft, Undo2, Printer, Download, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Normaliza los distintos valores de movementType que se guardan en la base
// de datos (p. ej. 'Venta', 'Ingreso') a los cánones usados por el filtro y
// las insignias del Kardex ('Salida', 'Entrada'), sin alterar el dato guardado.
const normalizeMovementType = (type: string): string => {
  switch (type) {
    case 'Venta':
    case 'venta':
    case 'Salida':
      return 'Salida';
    case 'Ingreso':
    case 'ingreso':
    case 'Compra':
    case 'compra':
    case 'ENTRADA':
    case 'Entrada':
      return 'Entrada';
    case 'Devolución':
    case 'devolucion':
    case 'Devolucion':
      return 'Devolución';
    case 'Ajuste':
    case 'AJUSTE_INICIAL':
      return 'Ajuste';
    default:
      return type;
  }
};

const getMovementTypeIcon = (type: InventoryMovement['movementType']) => {
  switch (normalizeMovementType(type)) {
    case 'Salida':
      return <ArrowUp className="h-4 w-4 text-red-500" />;
    case 'Entrada':
      return <ArrowDown className="h-4 w-4 text-green-500" />;
    case 'Devolución':
      return <Undo2 className="h-4 w-4 text-yellow-500" />;
    case 'Ajuste':
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};

const getMovementTypeVariant = (type: InventoryMovement['movementType']): "destructive" | "secondary" | "default" | "outline" => {
  switch (normalizeMovementType(type)) {
    case 'Salida':
      return 'destructive';
    case 'Entrada':
      return 'secondary';
    case 'Devolución':
      return 'default';
    case 'Ajuste':
      return 'outline';
    default:
      return 'outline';
  }
};

const formatQty = (n: number) => n.toLocaleString('es-NI', { maximumFractionDigits: 3 });
const formatMoney = (n: number) => `C$${n.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface KardexClientProps {
  initialMovements: InventoryMovement[];
  businessMode?: string;
}

export default function KardexClient({ initialMovements, businessMode }: KardexClientProps) {
  const [movements] = useState<InventoryMovement[]>(initialMovements);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<string>(
    businessMode === 'JEWELRY' ? 'jewelry' : businessMode === 'DISTRIBUIDORA' ? 'general' : 'all'
  );
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('movements');

  const today = new Date();
  const [rangeStart, setRangeStart] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rangeEnd, setRangeEnd] = useState<Date>(today);

  const [reportRows, setReportRows] = useState<KardexReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [printFormat, setPrintFormat] = useState<'letter' | '80mm'>('letter');

  const filteredMovements = useMemo(() => {
    let filtered = movements;

    if (date) {
      // Rango completo del día en hora local: 00:00:00.000 → 23:59:59.999.
      // Evita excluir movimientos por diferencias UTC/local.
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
      filtered = filtered.filter(mov => {
        const t = parseISO(mov.timestamp).getTime();
        return t >= dayStart && t <= dayEnd;
      });
    }

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(mov =>
        mov.productName.toLowerCase().includes(lowercasedSearchTerm) ||
        mov.user.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    if (movementFilter !== 'all') {
      filtered = filtered.filter(mov => normalizeMovementType(mov.movementType) === movementFilter);
    }

    if (inventoryTypeFilter !== 'all') {
      filtered = filtered.filter(mov => (mov as any).inventoryType === inventoryTypeFilter);
    }

    return filtered.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  }, [movements, searchTerm, movementFilter, inventoryTypeFilter, date]);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0).toISOString();
      const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999).toISOString();
      const res = await getKardexReport(start, end, inventoryTypeFilter === 'all' ? undefined : inventoryTypeFilter);
      if (res && res.success) {
        setReportRows(res.data ?? []);
      } else {
        setReportRows([]);
        setReportError(res?.error || 'Error al generar el reporte.');
      }
    } catch (err: any) {
      setReportRows([]);
      setReportError(err?.message || 'Error al generar el reporte.');
    } finally {
      setReportLoading(false);
    }
  }, [rangeStart, rangeEnd, inventoryTypeFilter]);

  useEffect(() => {
    if (activeTab === 'report') {
      loadReport();
    }
  }, [activeTab, loadReport]);

  const totals = useMemo(() => {
    return reportRows.reduce((acc, r) => ({
      entries: acc.entries + r.entries,
      exits: acc.exits + r.exits,
      value: acc.value + r.inventoryValue,
    }), { entries: 0, exits: 0, value: 0 });
  }, [reportRows]);

  const exportCSV = () => {
    if (!reportRows.length) return;
    const header = ['Codigo/SKU', 'Producto', 'Categoria', 'Stock Inicial', 'Entradas', 'Salidas', 'Stock Final', 'Valor Total (Costo)'];
    const lines = reportRows.map(r => [
      r.barcode || '',
      r.productName,
      r.category,
      formatQty(r.initialStock),
      formatQty(r.entries),
      formatQty(r.exits),
      formatQty(r.finalStock),
      r.inventoryValue.toFixed(2),
    ]);
    const csv = [header, ...lines]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kardex_Reporte_${format(rangeStart, 'yyyyMMdd')}_${format(rangeEnd, 'yyyyMMdd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #kardex-report-print, #kardex-report-print * { visibility: visible !important; }
          #kardex-report-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Kardex de Inventario</h1>
        <p className="text-muted-foreground">
          Consulta el historial de movimientos y el reporte general de inventario.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="report">Reporte General</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Registro de Kardex</CardTitle>
                  <CardDescription>Eventos de inventario registrados en el sistema.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
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

                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por producto o usuario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:max-w-xs pl-8"
                    />
                  </div>

                  <Select value={movementFilter} onValueChange={setMovementFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por movimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Salida">Salida</SelectItem>
                      <SelectItem value="Entrada">Entrada</SelectItem>
                      <SelectItem value="Devolución">Devolución</SelectItem>
                      <SelectItem value="Ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={inventoryTypeFilter} onValueChange={setInventoryTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Tipo de inventario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="jewelry">Joyería</SelectItem>
                      <SelectItem value="pharmacy">Farmacia</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Movimiento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Había</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Hay</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.length > 0 ? (
                      filteredMovements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="font-medium text-muted-foreground text-xs">{format(parseISO(mov.timestamp), 'hh:mm a', { locale: es })}</TableCell>
                          <TableCell className="font-semibold">{mov.productName}</TableCell>
                          <TableCell>{normalizeMovementType(mov.movementType)} #{mov.movementId}</TableCell>
                          <TableCell>
                            <Badge variant={getMovementTypeVariant(mov.movementType)} className='gap-1'>
                              {getMovementTypeIcon(mov.movementType)}
                              {normalizeMovementType(mov.movementType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{mov.previousQuantity.toFixed(3)}</TableCell>
                          <TableCell className={cn("text-right font-bold", mov.quantityChange > 0 ? 'text-green-600' : 'text-red-600')}>{mov.quantityChange.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-semibold">{mov.newQuantity.toFixed(3)}</TableCell>
                          <TableCell>{mov.user}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No se encontraron movimientos para la fecha o filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Reporte General de Kardex</CardTitle>
                  <CardDescription>Movimientos acumulados por producto dentro del rango de fechas.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(rangeStart, "PPP", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rangeStart}
                        onSelect={(d) => d && setRangeStart(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-muted-foreground">a</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(rangeEnd, "PPP", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rangeEnd}
                        onSelect={(d) => d && setRangeEnd(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Button variant="outline" className="gap-2" onClick={loadReport} disabled={reportLoading}>
                    {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Generar
                  </Button>

                  <Select value={printFormat} onValueChange={(v) => setPrintFormat(v as 'letter' | '80mm')}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Hoja Carta</SelectItem>
                      <SelectItem value="80mm">Tiquete 80mm</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={!reportRows.length}>
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                  <Button className="gap-2" onClick={handlePrint} disabled={!reportRows.length}>
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reportError ? (
                <p className="py-8 text-center text-sm text-destructive">{reportError}</p>
              ) : !reportRows.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay movimientos en el rango seleccionado. Ajusta las fechas o el tipo de inventario.
                </p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Productos con movimiento</p>
                      <p className="text-lg font-bold">{reportRows.length.toLocaleString('es-NI')}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Entradas (compras/ajustes)</p>
                      <p className="text-lg font-bold text-green-600">{formatQty(totals.entries)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Salidas (ventas)</p>
                      <p className="text-lg font-bold text-red-600">{formatQty(totals.exits)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Valor inventario (costo)</p>
                      <p className="text-lg font-bold">{formatMoney(totals.value)}</p>
                    </div>
                  </div>

                  <div
                    id="kardex-report-print"
                    className="rounded-md border p-2"
                    style={{ width: printFormat === '80mm' ? '80mm' : '100%' }}
                  >
                    <div className="mb-2 hidden print:block text-center">
                      <p className="text-sm font-bold uppercase">Reporte General de Kardex</p>
                      <p className="text-xs">
                        Desde: {format(rangeStart, 'dd/MM/yyyy')} — Hasta: {format(rangeEnd, 'dd/MM/yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">Generado: {format(new Date(), 'dd/MM/yyyy hh:mm a')}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs print:text-[10px]">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border px-2 py-1.5 text-left font-semibold">Código/SKU</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold">Producto</th>
                            <th className="border border-border px-2 py-1.5 text-left font-semibold">Categoría</th>
                            <th className="border border-border px-2 py-1.5 text-right font-semibold">Stock Inicial</th>
                            <th className="border border-border px-2 py-1.5 text-right font-semibold">Entradas</th>
                            <th className="border border-border px-2 py-1.5 text-right font-semibold">Salidas</th>
                            <th className="border border-border px-2 py-1.5 text-right font-semibold">Stock Final</th>
                            <th className="border border-border px-2 py-1.5 text-right font-semibold">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportRows.map((r) => (
                            <tr key={`${r.inventoryType}::${r.productName}`} className="align-top">
                              <td className="border border-border px-2 py-1">{r.barcode || '—'}</td>
                              <td className="border border-border px-2 py-1 font-medium">{r.productName}</td>
                              <td className="border border-border px-2 py-1">{r.category}</td>
                              <td className="border border-border px-2 py-1 text-right">{formatQty(r.initialStock)}</td>
                              <td className="border border-border px-2 py-1 text-right text-green-700">{formatQty(r.entries)}</td>
                              <td className="border border-border px-2 py-1 text-right text-red-700">{formatQty(r.exits)}</td>
                              <td className="border border-border px-2 py-1 text-right font-semibold">{formatQty(r.finalStock)}</td>
                              <td className="border border-border px-2 py-1 text-right">{formatMoney(r.inventoryValue)}</td>
                            </tr>
                          ))}
                          <tr className="bg-muted font-semibold">
                            <td colSpan={3} className="border border-border px-2 py-1.5 text-right">TOTALES</td>
                            <td className="border border-border px-2 py-1.5 text-right">{formatQty(reportRows.reduce((a, r) => a + r.initialStock, 0))}</td>
                            <td className="border border-border px-2 py-1.5 text-right">{formatQty(totals.entries)}</td>
                            <td className="border border-border px-2 py-1.5 text-right">{formatQty(totals.exits)}</td>
                            <td className="border border-border px-2 py-1.5 text-right">{formatQty(reportRows.reduce((a, r) => a + r.finalStock, 0))}</td>
                            <td className="border border-border px-2 py-1.5 text-right">{formatMoney(totals.value)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}