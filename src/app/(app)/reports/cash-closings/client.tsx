"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from '@/lib/router-nav';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CashClosingSession {
    id: string;
    cashierName: string;
    openingTime: string;
    closingTime: string | null;
    initialAmount: number;
    finalAmount: number | null;
    actualCash: number | null;
    totalSales: number | null;
    difference: number | null;
    status: string;
}

interface User {
    id: string;
    name: string;
}

interface CashClosingsClientProps {
    initialData: CashClosingSession[];
    users: User[];
}

export default function CashClosingsClient({ initialData, users }: CashClosingsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [date, setDate] = useState<DateRange | undefined>({
        from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
        to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    });

    const [selectedCashier, setSelectedCashier] = useState<string>(searchParams.get('cashierId') || 'all');

    useEffect(() => {
        const params = new URLSearchParams();
        if (date?.from) {
            params.set('from', date.from.toISOString());
            if (date.to) {
                params.set('to', date.to.toISOString());
            }
        }
        if (selectedCashier && selectedCashier !== 'all') {
            params.set('cashierId', selectedCashier);
        }

        const queryString = params.toString();
        if (queryString) {
            router.push(`?${queryString}`);
        } else {
            router.push('/reports/cash-closings');
        }
    }, [date, selectedCashier, router]);

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '-';
        return `C$${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    };

    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-headline font-bold tracking-tight">Reporte de Cierres de Caja</h1>
                    <p className="text-muted-foreground">
                        Historial detallado de las sesiones de caja.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium">Rango de Fechas</label>
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
                            <PopoverContent className="w-auto p-0" align="start">
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

                    <div className="flex flex-col space-y-2 min-w-[200px]">
                        <label className="text-sm font-medium">Cajero</label>
                        <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los cajeros" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los cajeros</SelectItem>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDate(undefined);
                                setSelectedCashier('all');
                            }}
                        >
                            Limpiar Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resultados ({initialData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha Apertura</TableHead>
                                <TableHead>Fecha Cierre</TableHead>
                                <TableHead>Cajero</TableHead>
                                <TableHead className="text-right">Monto Inicial</TableHead>
                                <TableHead className="text-right">Ventas Totales</TableHead>
                                <TableHead className="text-right">Efectivo Reportado</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No se encontraron registros con los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                initialData.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>{formatDate(session.openingTime)}</TableCell>
                                        <TableCell>{formatDate(session.closingTime)}</TableCell>
                                        <TableCell className="font-medium">{session.cashierName}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(session.initialAmount)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(session.totalSales)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(session.actualCash)}</TableCell>
                                        <TableCell className={cn(
                                            "text-right font-bold",
                                            (session.difference || 0) < 0 ? "text-red-600" : (session.difference || 0) > 0 ? "text-green-600" : "text-gray-600"
                                        )}>
                                            {formatCurrency(session.difference)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={session.status === 'closed' ? 'default' : 'secondary'}>
                                                {session.status === 'closed' ? 'Cerrada' : 'Abierta'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
