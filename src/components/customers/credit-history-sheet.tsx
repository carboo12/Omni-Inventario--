'use client';

import React, { useMemo } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    Calendar,
    Printer,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    Activity
} from 'lucide-react';
import { formatCurrency, cn, formatTicketNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface CreditHistorySheetProps {
    customer: any;
    onClose: () => void;
}

export function CreditHistorySheet({ customer, onClose }: CreditHistorySheetProps) {
    // 1. Cálculos de Inteligencia Crediticia
    const stats = useMemo(() => {
        const sales = customer.sales || [];
        const payments = customer.creditPayments || [];
        
        const totalBorrowed = sales.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
        const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const balance = customer.currentBalance;
        
        // Tasa de cumplimiento (dinero devuelto vs dinero prestado)
        const complianceRate = totalBorrowed > 0 ? (totalPaid / totalBorrowed) * 100 : 100;
        
        // Frecuencia de uso (créditos por mes aprox)
        const usageFrequency = sales.length;
        
        // Evaluación de riesgo básica
        let riskLevel: 'Bajo' | 'Medio' | 'Alto' = 'Bajo';
        if (complianceRate < 50 && balance > 0) riskLevel = 'Alto';
        else if (complianceRate < 80) riskLevel = 'Medio';

        return {
            totalBorrowed,
            totalPaid,
            balance,
            complianceRate,
            usageFrequency,
            riskLevel,
            totalTransactions: sales.length + payments.length
        };
    }, [customer]);

    // 2. Combinar eventos para la línea de tiempo
    const timelineEvents = useMemo(() => {
        const events = [
            ...(customer.sales || []).map((s: any) => ({
                id: `sale-${s.id}`,
                date: new Date(s.date),
                type: 'DEUDA',
                amount: s.totalAmount,
                description: `Compra al crédito #${s.invoiceNumber ? formatTicketNumber(s.invoiceNumber) : s.id.substring(0, 5)}`,
                icon: ArrowUpRight,
                color: 'text-red-500',
                bgColor: 'bg-red-50'
            })),
            ...(customer.creditPayments || []).map((p: any) => ({
                id: `pay-${p.id}`,
                date: new Date(p.timestamp),
                type: 'ABONO',
                amount: p.amount,
                description: `Abono recibido (Recibo #${p.receiptNumber || 'N/A'})`,
                icon: ArrowDownLeft,
                color: 'text-green-500',
                bgColor: 'bg-green-50'
            }))
        ];
        return events.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [customer]);

    const handleWhatsAppShare = () => {
        const text = `*FICHA DE CRÉDITO PERSONAL*\n"Omni Inventario +"\n\n*CLIENTE:* ${customer.fullName}\n*SALDO ACTUAL:* C$ ${stats.balance.toFixed(2)}\n\n*ESTADÍSTICAS:*\n- Créditos Totales: ${stats.usageFrequency}\n- Abonos Realizados: ${customer.creditPayments?.length || 0}\n- Cumplimiento: ${stats.complianceRate.toFixed(0)}%\n\nFecha de reporte: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* CABECERA DE PERFIL */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-black shadow-lg">
                        {customer.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-primary uppercase">{customer.fullName}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Badge className={cn(
                                "font-bold text-white",
                                stats.riskLevel === 'Bajo' ? "bg-green-500" : stats.riskLevel === 'Medio' ? "bg-yellow-500" : "bg-red-500"
                            )}>
                                Riesgo {stats.riskLevel}
                            </Badge>
                            <span>•</span>
                            <span className="font-medium">Límite: {formatCurrency(customer.creditLimit)}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Saldo Deudor Actual</p>
                    <p className={cn(
                        "text-4xl font-black",
                        stats.balance > 0 ? "text-red-600" : "text-green-600"
                    )}>
                        {formatCurrency(stats.balance)}
                    </p>
                </div>
            </div>

            {/* PANEL DE KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px]">
                            <TrendingUp className="h-3 w-3 text-green-500" /> Cumplimiento de Pago
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-2xl font-black text-primary">{stats.complianceRate.toFixed(1)}%</span>
                            <span className="text-xs text-muted-foreground">Histórico</span>
                        </div>
                        <Progress value={stats.complianceRate} className="h-2" />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px]">
                            <Activity className="h-3 w-3 text-blue-500" /> Frecuencia de Uso
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <div className="text-2xl font-black text-primary">{stats.usageFrequency}</div>
                            <div className="text-xs text-muted-foreground leading-tight">Créditos<br/>otorgados</div>
                        </div>
                        <div className="flex gap-1 mt-3">
                            {[...Array(5)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "h-1.5 flex-1 rounded-full",
                                        i < stats.usageFrequency / 2 ? "bg-blue-500" : "bg-gray-100"
                                    )} 
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-bold uppercase text-[10px]">
                            <DollarSign className="h-3 w-3 text-primary" /> Volumen Total
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Prestado:</span>
                                <span className="font-bold">{formatCurrency(stats.totalBorrowed)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Recuperado:</span>
                                <span className="font-bold text-green-600">{formatCurrency(stats.totalPaid)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CUERPO PRINCIPAL: LÍNEA DE TIEMPO Y DETALLES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LÍNEA DE TIEMPO CRÉDITICIA */}
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-black flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            LÍNEA DE TIEMPO CREDITICIA
                        </CardTitle>
                        <CardDescription>Rastreo cronológico de compras y abonos</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px] px-6 pb-6">
                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                {timelineEvents.map((event) => (
                                    <div key={event.id} className="relative flex items-start gap-4">
                                        <div className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shadow-sm shrink-0 z-10",
                                            event.bgColor,
                                            event.color
                                        )}>
                                            <event.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col gap-1 pt-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-primary">{format(event.date, 'dd MMM, yyyy', { locale: es })}</span>
                                                <Badge variant="outline" className="text-[10px] uppercase font-black px-1 h-4">
                                                    {event.type}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{event.description}</p>
                                            <p className={cn("text-base font-black", event.color)}>
                                                {event.type === 'DEUDA' ? '+' : '-'} {formatCurrency(event.amount)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {timelineEvents.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground italic">
                                        No hay movimientos registrados para este cliente.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* ANÁLISIS DE CUMPLIMIENTO / TICKET DE ABONO TIPO LEDGER */}
                <Card className="border-none shadow-lg bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-lg font-black flex items-center gap-2">
                            <Printer className="h-5 w-5 text-primary" />
                            RESUMEN PARA EL CLIENTE
                        </CardTitle>
                        <CardDescription>Vista previa de ficha contable</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div id="printable-receipt" className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 shadow-sm font-mono text-xs space-y-4">
                            <div className="text-center border-b pb-4 space-y-1">
                                <h3 className="font-black text-sm">FICHA DE CRÉDITO PERSONAL</h3>
                                <p className="text-gray-500 italic">"Omni Inventario + - Control Administrativo"</p>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">FECHA REPORTE:</span>
                                    <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">CLIENTE:</span>
                                    <span className="font-bold">{customer.fullName}</span>
                                </div>
                            </div>

                            <div className="border-y py-4 my-4 space-y-3">
                                <div className="flex justify-between text-base font-black">
                                    <span>SALDO ACTUAL:</span>
                                    <span className="text-red-600">{formatCurrency(stats.balance)}</span>
                                </div>
                                <Progress value={stats.complianceRate} className="h-1" />
                                <p className="text-[10px] text-center text-gray-400 italic">
                                    El cliente ha cubierto el {stats.complianceRate.toFixed(0)}% de sus deudas históricas.
                                </p>
                            </div>

                            <div className="space-y-1 text-gray-500">
                                <div className="flex justify-between">
                                    <span>Ventas al Crédito:</span>
                                    <span>{stats.usageFrequency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Abonos Realizados:</span>
                                    <span>{customer.creditPayments?.length || 0}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-center gap-2 no-print">
                                <Button size="sm" variant="outline" className="text-[10px] font-black h-8" onClick={() => window.print()}>
                                    <Printer className="mr-2 h-3 w-3" /> IMPRIMIR FICHA
                                </Button>
                                <Button size="sm" className="text-[10px] font-black h-8" onClick={handleWhatsAppShare}>
                                    COMPARTIR WHATSAPP
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
