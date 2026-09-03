"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    ShoppingCart,
    DollarSign,
    CreditCard,
    Coins,
    ChevronRight,
    CheckCircle2,
    Printer,
    ArrowLeft,
    Loader2,
    AlertTriangle
} from "lucide-react";
import { useRouter } from '@/lib/router-nav';
import { closeSession } from "@/lib/actions/cash-register";
import { formatTicketNumber } from '@/lib/utils';

interface SaleDetail {
    id: string;
    pieceId: string;
    pieceName: string;
    pieceCode: string;
    amount: number;
    description: string | null;
    createdAt: Date;
    karat: number;
    weight: number;
    invoiceNumber?: number;
}

interface SessionSummary {
    initialAmount: number;
    totalSales: number;
    salesCash: number;
    salesCard: number;
    salesUSD: number;
    cashierName: string;
    openingTime: string;
    status: string;
}

interface DailyClosingClientProps {
    sales: SaleDetail[];
    summary: SessionSummary;
    sessionId: string;
}

export default function DailyClosingClient({ sales, summary, sessionId }: DailyClosingClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isClosing, setIsClosing] = useState(false);

    const handleCloseDay = () => {
        router.push("/cash-register/close");
    };

    const formatCurrency = (amount: number, currency: string = "C$") => {
        return `${currency} ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date: Date) => {
        return format(new Date(date), "HH:mm", { locale: es });
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cierre de Día - Joyería</h1>
                        <p className="text-muted-foreground">Resumen detallado de operaciones de hoy.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
                    </Button>
                    {summary.status === 'open' ? (
                        <Button
                            className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-bold px-6"
                            onClick={handleCloseDay}
                            disabled={isClosing}
                        >
                            {isClosing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            REALIZAR CIERRE DE CAJA
                        </Button>
                    ) : (
                        <Badge className="h-10 px-4 text-sm bg-gray-200 text-gray-700 hover:bg-gray-200 uppercase font-bold">
                            Caja Cerrada
                        </Badge>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-[#673AB7]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Monto Inicial
                            <Coins className="h-4 w-4 text-[#673AB7]" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.initialAmount)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#8BC34A]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Ventas Efectivo
                            <DollarSign className="h-4 w-4 text-[#8BC34A]" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.salesCash)}</div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#2196F3]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Ventas Tarjeta
                            <CreditCard className="h-4 w-4 text-[#2196F3]" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.salesCard)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            TOTAL VENTAS
                            <ShoppingCart className="h-4 w-4 text-white" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{formatCurrency(summary.totalSales)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-[#8BC34A]" />
                        Detalle de Ventas del Día
                    </CardTitle>
                    <CardDescription>Lista de todas las piezas vendidas durante la sesión actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[100px]">Hora</TableHead>
                                    <TableHead>Cod / Ticket</TableHead>
                                    <TableHead>Pieza</TableHead>
                                    <TableHead>Karataje</TableHead>
                                    <TableHead>Peso (g)</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <AlertTriangle className="h-5 w-5 opacity-20" />
                                                <p>No se registraron ventas en esta sesión.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => (
                                        <TableRow key={sale.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDate(sale.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="font-mono text-[10px] text-[#673AB7] border-[#673AB7]/20 uppercase w-fit">
                                                        #{sale.pieceCode}
                                                    </Badge>
                                                    {sale.invoiceNumber && (
                                                        <span className="text-[10px] text-muted-foreground font-mono">Factura: {formatTicketNumber(sale.invoiceNumber)}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-gray-900">
                                                {sale.pieceName}
                                            </TableCell>
                                            <TableCell>{sale.karat} Quilates</TableCell>
                                            <TableCell>{sale.weight}g</TableCell>
                                            <TableCell className="text-right font-black text-[#8BC34A]">
                                                {formatCurrency(sale.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight className="h-4 w-4 text-gray-300" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-lg">Información de la Caja</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Cajero responsable:</span>
                            <span className="font-semibold">{summary.cashierName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Apertura:</span>
                            <span className="font-semibold">{format(new Date(summary.openingTime), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado Actual:</span>
                            <Badge variant={summary.status === 'open' ? 'default' : 'secondary'} className={summary.status === 'open' ? "bg-green-500" : ""}>
                                {summary.status === 'open' ? 'SESIÓN ABIERTA' : 'SESIÓN CERRADA'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {summary.salesUSD > 0 && (
                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                                <DollarSign className="h-5 w-5" /> Ventas en Dólares (USD)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-blue-700">
                                $ {summary.salesUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-sm text-blue-600 mt-1 italic">
                                * Este monto ya está incluido en los totales convertidos a córdobas.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

