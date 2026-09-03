"use client";

import React, { useState } from 'react';
import { PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { updatePurchaseOrderStatus, receivePurchaseOrder } from '@/lib/actions/purchase-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Truck, XCircle, Send } from 'lucide-react';
import Link from '@/lib/router-nav';
import { useRouter } from '@/lib/router-nav';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrderDetailsClientProps {
    order: PurchaseOrder & { items: PurchaseOrderItem[] };
}

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Pending': return 'destructive';
        case 'Ordered': return 'default';
        case 'Received': return 'secondary';
        case 'Cancelled': return 'outline';
        default: return 'outline';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'Pending': return 'Pendiente';
        case 'Ordered': return 'Ordenado';
        case 'Received': return 'Recibido';
        case 'Cancelled': return 'Cancelado';
        default: return status;
    }
};

export default function OrderDetailsClient({ order }: OrderDetailsClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    if (!order || !order.id) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/purchases">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <p className="mt-4 text-muted-foreground">Pedido no encontrado.</p>
            </div>
        );
    }
    const [isUpdating, setIsUpdating] = useState(false);
    const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
    const [receiveItems, setReceiveItems] = useState<{ [key: string]: { batch: string; expiryDate: string } }>({});

    const handleStatusChange = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const result = await updatePurchaseOrderStatus(order.id, newStatus);
            if (result.success) {
                toast({ title: "Estado actualizado", description: `El pedido ahora está ${getStatusLabel(newStatus)}` });
                router.refresh();
            } else {
                toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReceiveOrder = async () => {
        // Validate inputs
        const missingInfo = order.items?.some(item => {
            const info = receiveItems[item.id];
            return !info || !info.batch || !info.expiryDate;
        });

        if (missingInfo) {
            toast({ title: "Error", description: "Por favor ingrese Lote y Vencimiento para todos los productos", variant: "destructive" });
            return;
        }

        setIsUpdating(true);
        try {
            const itemsToReceive = (order.items || []).map(item => ({
                productId: item.productId!, // Assuming productId exists now
                quantity: item.quantity,
                batch: receiveItems[item.id].batch,
                expiryDate: receiveItems[item.id].expiryDate
            }));

            const result = await receivePurchaseOrder(order.id, itemsToReceive);

            if (result.success) {
                toast({ title: "Pedido Recibido", description: "El inventario ha sido actualizado correctamente." });
                setIsReceiveDialogOpen(false);
                router.refresh();
            } else {
                toast({ title: "Error", description: "No se pudo recibir el pedido", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const updateReceiveItem = (itemId: string, field: 'batch' | 'expiryDate', value: string) => {
        setReceiveItems(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/purchases">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Pedido {order.orderNumber}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getStatusVariant(order.status)}>
                                {getStatusLabel(order.status)}
                            </Badge>
                            <span className="text-muted-foreground text-sm">
                                • {new Date(order.date).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {order.status === 'Pending' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleStatusChange('Cancelled')}
                                disabled={isUpdating}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleStatusChange('Ordered')}
                                disabled={isUpdating}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Marcar como Ordenado
                            </Button>
                        </>
                    )}
                    {order.status === 'Ordered' && (
                        <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <Truck className="mr-2 h-4 w-4" />
                                    Marcar como Recibido
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Recibir Pedido</DialogTitle>
                                    <DialogDescription>
                                        Ingrese los detalles de lote y vencimiento para cada producto recibido.
                                        Esto actualizará automáticamente el inventario.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {order.items?.map((item) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                                            <div className="col-span-4">
                                                <Label>Producto</Label>
                                                <p className="font-medium text-sm mt-1">{item.productName}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <Label>Cant.</Label>
                                                <p className="font-medium text-sm mt-1">{item.quantity}</p>
                                            </div>
                                            <div className="col-span-3">
                                                <Label>Lote</Label>
                                                <Input
                                                    placeholder="Lote"
                                                    value={receiveItems[item.id]?.batch || ''}
                                                    onChange={(e) => updateReceiveItem(item.id, 'batch', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label>Vencimiento</Label>
                                                <Input
                                                    type="date"
                                                    value={receiveItems[item.id]?.expiryDate || ''}
                                                    onChange={(e) => updateReceiveItem(item.id, 'expiryDate', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleReceiveOrder} disabled={isUpdating}>
                                        {isUpdating ? 'Procesando...' : 'Confirmar Recepción'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Productos</CardTitle>
                        <CardDescription>Detalle de productos solicitados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">C${item.unitCost.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">C${(item.quantity * item.unitCost).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total del Pedido</TableCell>
                                    <TableCell className="text-right font-bold text-lg">
                                        C${order.totalAmount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="font-medium text-lg">{order.supplier?.name}</p>
                                <p className="text-sm text-muted-foreground">{order.supplier?.phone}</p>
                                <p className="text-sm text-muted-foreground">{order.supplier?.email}</p>
                                <p className="text-sm text-muted-foreground">{order.supplier?.address}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Información Adicional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Fecha Estimada de Entrega</p>
                                <p>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'No especificada'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Notas</p>
                                <p className="text-sm whitespace-pre-wrap">{order.notes || 'Sin notas'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
