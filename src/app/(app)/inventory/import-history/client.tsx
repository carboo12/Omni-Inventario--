'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from '@/lib/router-nav';

interface ImportHistoryClientProps {
    history: any[];
}

export function ImportHistoryClient({ history }: ImportHistoryClientProps) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
                    Historial de Importaciones
                </h1>
                <p className="text-muted-foreground">
                    Registro completo de todas las importaciones de inventario realizadas
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Importaciones Recientes</CardTitle>
                    <CardDescription>
                        {history.length} importaciones registradas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <div className="text-center py-12">
                            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                No hay importaciones registradas aún
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Archivo</TableHead>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Modo</TableHead>
                                        <TableHead className="text-right">Total Filas</TableHead>
                                        <TableHead className="text-right">Exitosas</TableHead>
                                        <TableHead className="text-right">Errores</TableHead>
                                        <TableHead className="text-right">Productos</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                {format(new Date(record.importedAt), 'PPp', { locale: es })}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {record.fileName}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{record.user.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">
                                                        {record.user.role}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={record.mode === 'create' ? 'default' : 'secondary'}>
                                                    {record.mode === 'create' ? 'Crear' : 'Actualizar'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {record.totalRows}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-green-600 font-medium">
                                                    {record.successfulRows}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {record.failedRows > 0 ? (
                                                    <span className="text-red-600 font-medium">
                                                        {record.failedRows}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {record.mode === 'create'
                                                    ? record.productsCreated
                                                    : record.productsUpdated}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {record.inventoryItemsCreated}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/inventory/import-history/${record.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
