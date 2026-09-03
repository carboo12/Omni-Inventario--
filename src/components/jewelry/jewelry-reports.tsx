"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gem, TrendingUp, Scale, Wallet } from "lucide-react";
import { formatNumber } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface JewelryReportsProps {
    inventoryStats: {
        name: string;
        count: number;
        valueUSD: number;
        weight: number;
    }[];
    salesStats: {
        chartData: { date: string; amount: number }[];
        materialData: { name: string; revenue: number }[];
        totalRevenue: number;
        totalCount: number;
    };
    topSelling: {
        count: number;
        revenue: number;
        name: string;
        code: string;
    }[];
    detailedInventory: {
        materialName: string;
        pieces: any[];
    }[];
    exchangeRate: number;
}

export function JewelryReports({ inventoryStats, salesStats, topSelling, detailedInventory, exchangeRate }: JewelryReportsProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Ingresos Totales (Periodo)</CardTitle>
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">C${formatNumber(salesStats.totalRevenue * exchangeRate)}</div>
                        <p className="text-xs text-muted-foreground">
                            ${formatNumber(salesStats.totalRevenue)} USD
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Piezas Vendidas</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{salesStats.totalCount}</div>
                        <p className="text-xs text-muted-foreground">En el rango seleccionado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Valor Inventario Actual</CardTitle>
                        <Gem className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            C${formatNumber(inventoryStats.reduce((acc, s) => acc + (s.valueUSD * exchangeRate), 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Valor total de piezas disponibles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Peso Total Inventario</CardTitle>
                        <Scale className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatNumber(inventoryStats.reduce((acc, s) => acc + s.weight, 0))} g
                        </div>
                        <p className="text-xs text-muted-foreground">Peso acumulado en stock</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Rendimiento de Ventas (Joyas)</CardTitle>
                        <CardDescription>Ingresos recaudados por ventas de piezas terminadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesStats.chartData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `C$${formatNumber(val / 1000)}k`} />
                                <Tooltip formatter={(val: number) => `C$${formatNumber(val)}`} />
                                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ventas por Material</CardTitle>
                        <CardDescription>Distribución de ingresos según el tipo de metal.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesStats.materialData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="revenue"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${formatNumber(percent * 100, 0)}%`}
                                >
                                    {salesStats.materialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `C$${formatNumber(val)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Piezas Más Vendidas (Ranking)</CardTitle>
                        <CardDescription>Top 10 piezas que más ingresos generan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pieza</TableHead>
                                    <TableHead className="text-right">Ventas</TableHead>
                                    <TableHead className="text-right">Total (C$)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topSelling.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                            Sin datos de ventas
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    topSelling.map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">#{p.code}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatNumber(p.count)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                C${formatNumber(p.revenue * exchangeRate)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="col-span-2 space-y-6">
                    <h2 className="text-xl font-bold mt-4">Inventario Detallado por Material</h2>
                    {detailedInventory.map((category, idx) => (
                        <Card key={idx}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Gem className="w-5 h-5 text-primary" />
                                    Material: {category.materialName}
                                </CardTitle>
                                <CardDescription>
                                    {category.pieces.length} piezas disponibles en esta categoría.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Código</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="text-right">Peso (g)</TableHead>
                                            <TableHead className="text-right">Kilates</TableHead>
                                            <TableHead className="text-right">Precio Costo</TableHead>
                                            <TableHead className="text-right">Precio Final</TableHead>
                                            <TableHead className="text-right pr-6">Utilidad</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {category.pieces.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No hay piezas disponibles de este material.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            category.pieces.map((piece) => (
                                                <TableRow key={piece.id}>
                                                    <TableCell className="pl-6 font-mono text-xs">{piece.code || piece.id.slice(-6)}</TableCell>
                                                    <TableCell className="font-medium">{piece.name}</TableCell>
                                                    <TableCell className="text-right">{formatNumber(piece.weight)}g</TableCell>
                                                    <TableCell className="text-right">{piece.karat}k</TableCell>
                                                    <TableCell className="text-right">C${formatNumber(piece.laborCost * exchangeRate)}</TableCell>
                                                    <TableCell className="text-right font-bold">C${formatNumber(piece.calculatedPrice * exchangeRate)}</TableCell>
                                                    <TableCell className="text-right text-green-600 pr-6">
                                                        +C${formatNumber(piece.profitAmount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
