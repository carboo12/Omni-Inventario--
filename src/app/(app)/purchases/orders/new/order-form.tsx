"use client";

import React, { useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import { Supplier, Product } from '@/lib/types';
import { createPurchaseOrder } from '@/lib/actions/purchase-orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Plus, Search, Trash2, ArrowLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from '@/lib/router-nav';

interface NewOrderClientProps {
    suppliers: Supplier[];
    products: Product[];
}

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
}

export default function NewOrderClient({ suppliers, products }: NewOrderClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [supplierId, setSupplierId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentType, setPaymentType] = useState('CASH');
    const [items, setItems] = useState<OrderItem[]>([
        { id: '1', productId: '', productName: '', quantity: 1, unitCost: 0 }
    ]);

    const [productOpenId, setProductOpenId] = useState<string | null>(null);
    const [productQuery, setProductQuery] = useState('');

    const filteredProducts = React.useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.barcode || '').toLowerCase().includes(q)
        );
    }, [products, productQuery]);

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), productId: '', productName: '', quantity: 1, unitCost: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                if (field === 'productId') {
                    const product = products.find(p => p.id === value);
                    return {
                        ...item,
                        productId: value as string,
                        productName: product ? product.name : '',
                        unitCost: product && product.costPriceNIO ? product.costPriceNIO : item.unitCost
                    };
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) {
            toast({ title: "Error", description: "Seleccione un proveedor", variant: "destructive" });
            return;
        }
        if (items.some(item => !item.productId)) {
            toast({ title: "Error", description: "Seleccione todos los productos", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createPurchaseOrder({
                supplierId,
                date: new Date(date),
                expectedDate: expectedDate ? new Date(expectedDate) : undefined,
                notes,
                paymentType,
                items: items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: Number(item.quantity),
                    unitCost: Number(item.unitCost)
                }))
            });

            if (result.success) {
                toast({ title: "Éxito", description: "Pedido creado correctamente" });
                router.push('/purchases');
            } else {
                toast({ title: "Error", description: "No se pudo crear el pedido", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/purchases">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nuevo Pedido</h1>
                    <p className="text-muted-foreground">Crear una nueva orden de compra</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Pedido</CardTitle>
                        <CardDescription>Información general del pedido</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Proveedor</Label>
                                <Select value={supplierId} onValueChange={setSupplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar proveedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(supplier => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha del Pedido</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha Estimada de Entrega (Opcional)</Label>
                                <Input
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Pago</Label>
                                <Select value={paymentType} onValueChange={setPaymentType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Al Contado</SelectItem>
                                        <SelectItem value="CREDIT">A Crédito (Cuentas por Pagar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea
                                placeholder="Instrucciones especiales o notas..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Productos</CardTitle>
                            <CardDescription>Lista de productos a ordenar</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Producto
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                                <div className="col-span-5 space-y-2">
                                    <Label className={index !== 0 ? "sr-only" : ""}>Producto</Label>
                                    <Popover
                                        open={productOpenId === item.id}
                                        onOpenChange={(open) => {
                                            setProductOpenId(open ? item.id : null);
                                            if (open) setProductQuery('');
                                        }}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={productOpenId === item.id}
                                                className="w-full justify-between font-normal"
                                            >
                                                {item.productName ? (
                                                    <span className="truncate">{item.productName}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Seleccionar producto</span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[var(--radix-popover-trigger-width)] p-0"
                                            align="start"
                                            side="bottom"
                                            sideOffset={4}
                                            avoidCollisions={false}
                                        >
                                            <div className="flex items-center border-b px-3">
                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                <Input
                                                    autoFocus
                                                    value={productQuery}
                                                    onChange={(e) => setProductQuery(e.target.value)}
                                                    placeholder="Buscar producto o código..."
                                                    className="border-0 shadow-none focus-visible:ring-0 h-11"
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredProducts.length === 0 ? (
                                                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                                                        No se encontraron productos
                                                        {productQuery.trim() ? ` para "${productQuery.trim()}"` : ""}.
                                                    </div>
                                                ) : (
                                                    <div className="p-1">
                                                        {filteredProducts.map((product) => (
                                                            <button
                                                                key={product.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateItem(item.id, 'productId', product.id);
                                                                    setProductOpenId(null);
                                                                    setProductQuery('');
                                                                }}
                                                                className={cn(
                                                                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                                    item.productId === product.id && "bg-accent text-accent-foreground"
                                                                )}
                                                            >
                                                                <span className="truncate">
                                                                    {product.name}
                                                                    {product.barcode ? ` (${product.barcode})` : ""}
                                                                </span>
                                                                {item.productId === product.id && (
                                                                    <Check className="absolute left-2 h-4 w-4" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className={index !== 0 ? "sr-only" : ""}>Cantidad</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label className={index !== 0 ? "sr-only" : ""}>Costo Unit. (C$)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitCost}
                                        onChange={(e) => updateItem(item.id, 'unitCost', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="flex-1 text-right font-medium pt-8 md:pt-0">
                                        C${(item.quantity * item.unitCost).toFixed(2)}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive/90"
                                        onClick={() => removeItem(item.id)}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right">
                                <p className="text-muted-foreground">Total Estimado</p>
                                <p className="text-2xl font-bold">C${calculateTotal().toLocaleString('es-NI', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6 flex justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/purchases">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>Guardando...</>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Crear Pedido
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
