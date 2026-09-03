"use client";

import dynamic from '@/lib/dynamic'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useRouter, useSearchParams } from '@/lib/router-nav';

const JewelryReports = dynamic(
  () => import("@/components/jewelry/jewelry-reports").then((mod) => ({ default: mod.JewelryReports })),
  { ssr: false }
);

interface ReportsClientProps {
  isJewelry?: boolean;
  exchangeRate?: number;
  salesData?: { month: string; sales: number }[];
  topProducts?: { name: string; unitsSold: number; revenue: number }[];
  lowStockInventory?: { id: string; productName: string; quantity: number; minStock: number; status: string }[];
  expiringProducts?: { id: string; productName: string; batch: string; expiryDate: string; quantity: number }[];
  jewelryData?: {
    inventoryStats: any[];
    salesStats: any;
    topSelling: any[];
    detailedInventory: any[];
  };
  creditData?: {
    topCreditProducts: any[];
    customerRanking: any[];
    summary: {
      totalBorrowed: number;
      totalRecovered: number;
      recoveryRate: number;
      activeDebtors: number;
    };
  };
  priceLevelData?: {
    levels: { level: number; label: string; units: number; revenue: number }[];
    users: {
      id: string;
      name: string;
      total: number;
      manualCount: number;
      levels: { level: number; label: string; units: number; revenue: number }[];
    }[];
    summary: {
      totalRevenue: number;
      manualLevelCount: number;
    };
  };
}

export default function ReportsClient({
  isJewelry,
  exchangeRate = 36.5,
  salesData = [],
  topProducts = [],
  lowStockInventory = [],
  expiringProducts = [],
  jewelryData,
  creditData,
  priceLevelData
}: ReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>({
    from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
    to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
  });

  useEffect(() => {
    if (date?.from) {
      const params = new URLSearchParams();
      params.set('from', date.from.toISOString());
      if (date.to) {
        params.set('to', date.to.toISOString());
      }
      router.push(`?${params.toString()}`);
    } else {
      if (searchParams.has('from')) {
        router.push('/reports');
      }
    }
  }, [date, router, searchParams]);

  const chartConfig = {
    sales: {
      label: 'Ventas (C$)',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
            {isJewelry ? "Informes de Joyería" : "Informes Financieros"}
          </h1>
          <p className="text-muted-foreground">
            {isJewelry
              ? "Analice el valor del inventario por material y rendimiento de ventas."
              : "Analice datos de ventas, inventario y flujo de caja."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => router.push('/reports/cash-closings')}>
            Ver Cierres de Caja
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                      {format(date.to, "LLL dd, y", { locale: es })}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y", { locale: es })
                  )
                ) : (
                  <span>Seleccionar rango de fechas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isJewelry && jewelryData ? (
        <JewelryReports
          inventoryStats={jewelryData.inventoryStats}
          salesStats={jewelryData.salesStats}
          topSelling={jewelryData.topSelling}
          detailedInventory={jewelryData.detailedInventory}
          exchangeRate={exchangeRate}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Rendimiento de Ventas</CardTitle>
              <CardDescription>Ingresos por ventas en el período seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={salesData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `C$${formatNumber(Number(value) / 1000)}k`}
                  />
                  <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `C$${formatNumber(Number(value) / 1000)}k`} />} />
                  <Legend />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
              <CardDescription>Top 5 productos por ingresos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className='text-right'>Unidades</TableHead>
                      <TableHead className='text-right'>Ingresos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                          No hay datos para este período
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProducts.map(product => (
                        <TableRow key={product.name}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className='text-right'>{formatNumber(product.unitsSold, 0)}</TableCell>
                          <TableCell className='text-right'>C${formatNumber(product.revenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                ⚠️ Stock Bajo
              </CardTitle>
              <CardDescription>Productos que necesitan reabastecimiento urgente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className='text-right'>Stock Actual</TableHead>
                      <TableHead className='text-right'>Mínimo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                          Todo el inventario está saludable
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockInventory.slice(0, 5).map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className='text-right font-bold text-red-600'>{item.quantity}</TableCell>
                          <TableCell className='text-right text-muted-foreground'>{item.minStock}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-orange-600 flex items-center gap-2">
                📅 Próximos a Vencer
              </CardTitle>
              <CardDescription>Productos que vencen en los próximos 30 días.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead className='text-right'>Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                          No hay productos próximos a vencer
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiringProducts.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.batch}</TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {new Date(item.expiryDate).toLocaleDateString('es-NI')}
                          </TableCell>
                          <TableCell className='text-right'>{item.quantity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* NUEVO: DASHBOARD DE CRÉDITO */}
          {creditData && (
          <div className="col-span-2 mt-8">
            <h2 className="text-xl font-black text-primary uppercase mb-4 flex items-center gap-2">
               Análisis de Desempeño Crediticio
            </h2>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase">Recuperación Total</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-primary">{formatCurrency(creditData.summary.totalRecovered || 0)}</p></CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase text-red-600">Cartera Activa (Deuda)</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-red-600">{formatCurrency((creditData.summary.totalBorrowed || 0) - (creditData.summary.totalRecovered || 0))}</p></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase text-green-600">Tasa de Retorno</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-green-600">{formatNumber(creditData.summary.recoveryRate, 1)}%</p></CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase text-blue-600">Deudores Activos</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-blue-600">{creditData.summary.activeDebtors}</p></CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black">PRODUCTOS MÁS "FIADOS"</CardTitle>
                        <CardDescription>Artículos con mayor volumen de venta al crédito.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <BarChart data={creditData.topCreditProducts || []} layout="vertical">
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} className="text-[10px] font-bold" />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black">RANKING DE CLIENTES ELITE</CardTitle>
                        <CardDescription>Clientes con mayor compromiso y cumplimiento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Cumplimiento</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {(creditData.customerRanking || []).map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-bold text-xs uppercase">{c.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge className={cn(
                                                "font-black text-[10px]",
                                                (c.complianceRate ?? 0) > 90 ? "bg-green-500" : "bg-primary"
                                            )}>
                                                {c.complianceRate != null ? `${formatNumber(c.complianceRate, 0)}%` : '—'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
          </div>
          )}

          {/* NUEVO: AUDITORÍA DE NIVELES DE PRECIO */}
          {priceLevelData && (
          <div className="col-span-2 mt-8">
            <h2 className="text-xl font-black text-primary uppercase mb-4 flex items-center gap-2">
               Auditoría de Niveles de Precio
            </h2>
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase">Ventas Totales (rango)</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-primary">{formatCurrency(priceLevelData.summary.totalRevenue || 0)}</p></CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                    <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase text-amber-600">Unidades a Precio Manual</CardDescription></CardHeader>
                    <CardContent><p className="text-xl font-black text-amber-600">{priceLevelData.summary.manualLevelCount}</p></CardContent>
                </Card>
                {priceLevelData.levels.map(l => (
                    <Card key={l.level} className="bg-slate-50 border-slate-200">
                        <CardHeader className="py-2"><CardDescription className="text-[10px] font-black uppercase">{l.label}</CardDescription></CardHeader>
                        <CardContent>
                            <p className="text-xl font-black">{l.units} uds</p>
                            <p className="text-xs text-muted-foreground font-semibold">{formatCurrency(l.revenue)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cajero</TableHead>
                            <TableHead className="text-right">Total (C$)</TableHead>
                            <TableHead className="text-right">Manual</TableHead>
                            {priceLevelData.levels.map(l => (
                                <TableHead key={l.level} className="text-right">
                                    {l.level === 0 ? 'Manual' : `P${l.level}`}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(priceLevelData.users || []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={priceLevelData.levels.length + 3} className="text-center text-muted-foreground h-24">
                                    No hay ventas en el rango seleccionado
                                </TableCell>
                            </TableRow>
                        ) : (
                            priceLevelData.users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-bold text-xs uppercase">{u.name}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(u.total)}</TableCell>
                                    <TableCell className="text-right">
                                        {u.manualCount > 0 ? (
                                            <Badge className="bg-amber-500 text-[10px] font-black">{u.manualCount}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    {priceLevelData.levels.map(l => {
                                        const rec = u.levels.find(ul => ul.level === l.level);
                                        return (
                                            <TableCell key={l.level} className="text-right">
                                                {rec ? (
                                                    <span className="font-semibold text-xs">
                                                        {rec.units} u · {formatCurrency(rec.revenue)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
