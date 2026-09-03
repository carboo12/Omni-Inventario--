"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface InventoryHistoryClientProps {
    movements: any[];
}

export default function InventoryHistoryClient({ movements }: InventoryHistoryClientProps) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
                    Historial de Inventario
                </h1>
                <p className="text-muted-foreground">
                    Registro detallado de todos los movimientos de productos.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Movimientos Recientes</CardTitle>
                    <CardDescription>
                        Últimos 50 movimientos registrados en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Notas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.length > 0 ? (
                                    movements.map((movement) => (
                                        <TableRow key={movement.id}>
                                            <TableCell>
                                                {format(new Date(movement.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </TableCell>
                                            <TableCell className="font-medium">{movement.productName}</TableCell>
                                            <TableCell>
                                                <Badge variant={movement.movementType === 'Venta' ? 'default' : 'secondary'}>
                                                    {movement.movementType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${movement.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
                                            </TableCell>
                                            <TableCell>{movement.user?.name || 'Sistema'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{movement.notes || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No hay movimientos registrados.
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
