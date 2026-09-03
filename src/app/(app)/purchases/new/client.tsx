'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from '@/lib/dynamic'
import { useRouter } from '@/lib/router-nav';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Plus, Trash2, Package, ChevronDown, ChevronRight, ListTree, Tags, Pencil } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Supplier } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createPurchaseInvoiceWithItems } from '@/lib/actions/purchases';
import { useToast } from '@/hooks/use-toast';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { useAuth } from '@/hooks/use-auth';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const PurchaseItemDialog = dynamic(
    () => import('@/components/purchases/purchase-item-dialog').then((mod) => ({ default: mod.PurchaseItemDialog })),
    { ssr: false }
);

function VariantDialog({ isOpen, onClose, onAdd, defaultCost, defaultPrice, currencySymbol, editingItem }: { isOpen: boolean, onClose: () => void, onAdd: (v: any) => void, defaultCost: number, defaultPrice: number, currencySymbol: string, editingItem?: any }) {
    const [formData, setFormData] = useState({
        size: '',
        color: '',
        costPriceNIO: defaultCost || 0,
        priceNIO: defaultPrice || 0,
        quantity: 1
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                size: editingItem?.size || '',
                color: editingItem?.color || '',
                costPriceNIO: editingItem?.costPriceNIO ?? (defaultCost || 0),
                priceNIO: editingItem?.priceNIO ?? (defaultPrice || 0),
                quantity: editingItem?.quantity || 1
            });
        }
    }, [isOpen, defaultCost, defaultPrice, editingItem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agregar Variante</DialogTitle>
                    <DialogDescription>Agregue detalles de inventario para este producto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Talla</Label>
                            <Input value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} placeholder="Ej: S, M, L" />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Ej: Azul" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-red-600 font-bold">Costo ({currencySymbol})</Label>
                            <Input type="number" step="0.01" required value={formData.costPriceNIO} onChange={e => setFormData({...formData, costPriceNIO: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-green-600 font-bold">Precio ({currencySymbol})</Label>
                            <Input type="number" step="0.01" required value={formData.priceNIO} onChange={e => setFormData({...formData, priceNIO: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-black">Cantidad</Label>
                            <Input type="number" required min="1" className="bg-yellow-50" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Agregar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function GroupDialog({ isOpen, onClose, onSave, editingGroup }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, editingGroup: any }) {
    const [formData, setFormData] = useState({
        productName: '',
        barcode: '',
        category: '',
        brand: '',
        batch: '',
    });

    useEffect(() => {
        if (isOpen && editingGroup) {
            setFormData({
                productName: editingGroup.productName || '',
                barcode: editingGroup.barcode || '',
                category: editingGroup.category || '',
                brand: editingGroup.brand || '',
                batch: editingGroup.batch || '',
            });
        }
    }, [isOpen, editingGroup]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Datos del Producto</DialogTitle>
                    <DialogDescription>Modifique los datos generales para este grupo.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input required value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Código</Label>
                            <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Marca</Label>
                            <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Lote</Label>
                            <Input value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const formSchema = z.object({
    supplierId: z.string({ required_error: "Debe seleccionar un proveedor." }),
    invoiceNumber: z.string().min(1, { message: "El número de factura es requerido." }),
    date: z.date({ required_error: "La fecha de la factura es requerida." }),
    dueDate: z.date({ required_error: "La fecha de vencimiento es requerida." }),
    totalAmount: z.coerce.number().min(0.01, { message: "El monto total debe ser mayor a cero." }),
    purchaseType: z.enum(['CONTADO', 'CREDITO'], { required_error: "Debe seleccionar el tipo de compra." }),
    subtotal: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPurchaseClientProps {
    initialSuppliers: Supplier[];
}

const getPurchaseGroupKey = (item: any) => {
    if (item.productId) return `product:${item.productId}`;

    return [
        'new',
        item.productName,
        item.barcode,
        item.category,
        item.brand,
        item.batch,
        item.expiryDate,
    ].map(value => String(value || '').trim().toLowerCase()).join('|');
};

const getPurchaseLineKey = (item: any) => {
    return [
        getPurchaseGroupKey(item),
        item.variantId,
        item.size,
        item.color,
        item.barcode,
    ].map(value => String(value || '').trim().toLowerCase()).join('|');
};

export default function NewPurchaseClient({ initialSuppliers }: NewPurchaseClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { mode } = useBusinessMode();
    const { user } = useAuth();
    // Currency dynamic symbol
    const { settings } = { settings: { importProductsInDollars: false } }; // Placeholder if useSettings not imported, or wait, let's use it properly
    const currencySymbol = settings.importProductsInDollars ? '$' : 'C$';

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [variantDialogGroup, setVariantDialogGroup] = useState<any | null>(null);
    const [editingVariant, setEditingVariant] = useState<any | null>(null);
    const [editingGroup, setEditingGroup] = useState<any | null>(null);

    const suppliers: Supplier[] = [...initialSuppliers].sort((a, b) => a.name.localeCompare(b.name));

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            invoiceNumber: '',
            totalAmount: 0,
            purchaseType: 'CREDITO',
        },
    });

    // Auto-calculate total amount based on items
    const itemsTotal = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (item.costPriceNIO * item.quantity), 0);
    }, [selectedItems]);

    const groupedItems = useMemo(() => {
        const groups = new Map<string, any>();

        selectedItems.forEach((item) => {
            const key = getPurchaseGroupKey(item);
            const lineTotal = item.costPriceNIO * item.quantity;
            const existing = groups.get(key);

            if (!existing) {
                groups.set(key, {
                    key,
                    productName: item.productName,
                    barcode: item.barcode,
                    category: item.category,
                    brand: item.brand,
                    batch: item.batch,
                    expiryDate: item.expiryDate,
                    minStock: item.minStock,
                    totalQuantity: item.quantity,
                    totalCost: lineTotal,
                    hasVariants: Boolean(item.variantId || item.size || item.color),
                    items: [item],
                });
                return;
            }

            existing.totalQuantity += item.quantity;
            existing.totalCost += lineTotal;
            existing.hasVariants = existing.hasVariants || Boolean(item.variantId || item.size || item.color);
            existing.items.push(item);
        });

        return Array.from(groups.values());
    }, [selectedItems]);

    // Update form total when items change (optional, user can override)
    React.useEffect(() => {
        if (itemsTotal > 0) {
            form.setValue('totalAmount', itemsTotal);
        }
    }, [itemsTotal, form]);

    const handleAddItem = (item: any) => {
        // If it's boutique and they are adding a new product with 0 quantity, we treat it as an empty group
        const isBoutiqueEmpty = (mode as string) === 'BOUTIQUE' && (!item.costPriceNIO && !item.priceNIO && item.quantity === 1 && !item.size && !item.color);
        if (isBoutiqueEmpty) {
            item.quantity = 0; // It's just a shell until variants are added
        }

        setSelectedItems(prev => {
            const incomingLineKey = getPurchaseLineKey(item);
            const existing = prev.find(current => getPurchaseLineKey(current) === incomingLineKey);

            if (existing && !isBoutiqueEmpty) {
                return prev.map(current => {
                    if (current.id !== existing.id) return current;

                    return {
                        ...current,
                        ...item,
                        id: current.id,
                        quantity: current.quantity + item.quantity,
                    };
                });
            }

            return [...prev, { ...item, id: Math.random().toString(36).substr(2, 9) }];
        });
    };

    const handleAddVariant = (variantData: any) => {
        if (!variantDialogGroup) return;
        
        const baseItem = variantDialogGroup.items[0]; // use the first item as template
        const newItem = {
            ...baseItem,
            ...variantData,
            variantId: undefined, // ensure it creates a new line if different
        };
        
        setSelectedItems(prev => {
            if (editingVariant) {
                // We are editing an existing variant
                return prev.map(item => {
                    if (item.id === editingVariant.id) {
                        return { ...item, ...variantData };
                    }
                    return item;
                });
            }

            // Remove the shell item (quantity 0) from the same group if it exists
            const groupKey = variantDialogGroup.key;
            let filtered = prev;
            if (baseItem.quantity === 0) {
                filtered = prev.filter(item => !(getPurchaseGroupKey(item) === groupKey && item.quantity === 0));
            }
            
            // Now add the new item using the normal logic
            const incomingLineKey = getPurchaseLineKey(newItem);
            const existing = filtered.find(current => getPurchaseLineKey(current) === incomingLineKey);

            if (existing) {
                return filtered.map(current => {
                    if (current.id !== existing.id) return current;
                    return {
                        ...current,
                        ...newItem,
                        id: current.id,
                        quantity: current.quantity + newItem.quantity,
                    };
                });
            }

            return [...filtered, { ...newItem, id: Math.random().toString(36).substr(2, 9) }];
        });
    };

    const handleSaveGroup = (groupData: any) => {
        if (!editingGroup) return;
        
        setSelectedItems(prev => prev.map(item => {
            if (getPurchaseGroupKey(item) === editingGroup.key) {
                return { ...item, ...groupData };
            }
            return item;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setSelectedItems(selectedItems.filter(item => item.id !== id));
    };

    const handleRemoveGroup = (groupKey: string) => {
        setSelectedItems(prev => prev.filter(item => getPurchaseGroupKey(item) !== groupKey));
        setExpandedGroups(prev => {
            const next = { ...prev };
            delete next[groupKey];
            return next;
        });
    };

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const handleUpdateQuantity = (id: string, delta: number) => {
        setSelectedItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const handleSubmit = async (values: FormValues) => {
        if (selectedItems.length === 0) {
            toast({
                title: "No hay productos",
                description: "Debe agregar al menos un producto a la factura.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        const supplier = suppliers.find(s => s.id === values.supplierId);
        if (!supplier) return;

        const result = await createPurchaseInvoiceWithItems(
            {
                supplierId: values.supplierId,
                supplierName: supplier.name,
                invoiceNumber: values.invoiceNumber,
                date: format(values.date, 'yyyy-MM-dd'),
                issueDate: format(values.date, 'yyyy-MM-dd'),
                dueDate: format(values.dueDate, 'yyyy-MM-dd'),
                paymentType: values.purchaseType === 'CONTADO' ? 'CASH' : 'CREDIT',
                subtotal: values.subtotal ?? null,
                tax: values.tax ?? null,
                discount: values.discount ?? null,
                totalAmount: values.totalAmount,
                paidAmount: values.purchaseType === 'CONTADO' ? values.totalAmount : 0,
                status: values.purchaseType === 'CONTADO' ? 'Pagada' : 'Pendiente',
                details: `Compra de ${selectedItems.length} productos registrados profesionalmente. Tipo: ${values.purchaseType}.`,
            },
            selectedItems.map(item => ({
                ...item,
                inventoryType: (mode as string).toLowerCase() === 'boutique' ? 'general' : (mode as string).toLowerCase()
            })),
            user?.id || 'system'
        );

        if (result.success) {
            toast({
                title: 'Compra Registrada',
                description: `La factura ${values.invoiceNumber} y sus productos han sido procesados correctamente.`,
            });
            router.push('/purchases');
        } else {
            toast({
                title: "Error",
                description: "No se pudo registrar la compra. Verifique los datos.",
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Registrar Nueva Compra</h1>
                    <p className="text-muted-foreground">
                        Gestione el ingreso de mercadería y asocie los productos a la factura del proveedor.
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sidebar: Invoice Details */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Datos de Factura</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="supplierId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Proveedor</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione un proveedor" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {suppliers.map(supplier => (
                                                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="invoiceNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número de Factura</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej: FAC-2024-999" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="purchaseType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Compra</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione el tipo" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="CONTADO">Al Contado</SelectItem>
                                                        <SelectItem value="CREDITO">Al Crédito (Cuentas por Pagar)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Fecha de Factura</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "dd/MM/yyyy")
                                                                ) : (
                                                                    <span>Seleccione fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Fecha de Vencimiento</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "dd/MM/yyyy")
                                                                ) : (
                                                                    <span>Seleccione fecha</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="totalAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-primary font-bold">Monto Total Facturado ({currencySymbol})</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" {...field} className="text-xl font-black text-primary border-primary/20" />
                                                </FormControl>
                                                <FormMessage />
                                                {itemsTotal > 0 && itemsTotal !== Number(field.value) && (
                                                    <p className="text-[10px] text-yellow-600 font-bold uppercase mt-1">
                                                        Diferencia con items: {currencySymbol} {(Number(field.value) - itemsTotal).toFixed(2)}
                                                    </p>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="subtotal"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold text-slate-500">Subtotal</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tax"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold text-slate-500">IVA / Impuesto</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="discount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold text-slate-500">Descuento</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t p-6">
                                    <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            'Guardar Factura'
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>

                        {/* Main Area: Product Table */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="h-full flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <div>
                                        <CardTitle>Productos en Factura</CardTitle>
                                        <CardDescription>Agregue los artículos recibidos</CardDescription>
                                    </div>
                                    <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Agregar Producto
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex-1 p-0 overflow-hidden">
                                    <ScrollArea className="h-[500px]">
                                        <Table>
                                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Cant.</TableHead>
                                                    <TableHead>Producto</TableHead>
                                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                                    <TableHead className="text-right">Subtotal</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupedItems.length > 0 ? (
                                                    groupedItems.map((group) => {
                                                        const isExpanded = expandedGroups[group.key] ?? group.hasVariants;
                                                        const averageCost = group.totalQuantity > 0 ? group.totalCost / group.totalQuantity : 0;

                                                        return (
                                                        <React.Fragment key={group.key}>
                                                        <TableRow className="group bg-background">
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-lg leading-none">{group.totalQuantity}</span>
                                                                    <span className="text-[10px] uppercase text-muted-foreground">unidades</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-bold">{group.productName}</span>
                                                                    <div className="flex gap-1 flex-wrap text-xs text-muted-foreground">
                                                                        {group.barcode && <Badge variant="outline" className="text-[10px] px-1 py-0">{group.barcode}</Badge>}
                                                                        {group.category && <Badge variant="secondary" className="text-[10px] px-1 py-0">{group.category}</Badge>}
                                                                        {group.brand && <Badge variant="secondary" className="text-[10px] px-1 py-0">{group.brand}</Badge>}
                                                                        {group.batch && <Badge variant="outline" className="text-[10px] px-1 py-0">Lote: {group.batch}</Badge>}
                                                                        {group.items.length > 1 && <Badge className="text-[10px] px-1 py-0">{group.items.length} variantes</Badge>}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">{currencySymbol} {averageCost.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-bold text-primary">{currencySymbol} {group.totalCost.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    {(mode as string) === 'BOUTIQUE' && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="secondary"
                                                                            size="icon"
                                                                            onClick={() => { setVariantDialogGroup(group); setExpandedGroups(prev => ({...prev, [group.key]: true})); }}
                                                                            title="Agregar Variante"
                                                                            className="h-8 w-8 text-primary"
                                                                        >
                                                                            <Tags className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setEditingGroup(group)}
                                                                        title="Editar Producto"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-100/50"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => toggleGroup(group.key)}
                                                                        title="Ver detalle de variantes"
                                                                        className="h-8 w-8"
                                                                    >
                                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                    </Button>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => handleRemoveGroup(group.key)}
                                                                    className="text-muted-foreground hover:text-red-600 hover:bg-red-100/50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                        {isExpanded && (
                                                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                                <TableCell colSpan={5} className="p-0">
                                                                    <div className="space-y-3 p-4">
                                                                        <div className="grid gap-2 rounded-md border bg-background p-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                                                                            <div><span className="font-semibold text-foreground">Codigo:</span> {group.barcode || 'Sin codigo'}</div>
                                                                            <div><span className="font-semibold text-foreground">Categoria:</span> {group.category || 'Sin categoria'}</div>
                                                                            <div><span className="font-semibold text-foreground">Marca:</span> {group.brand || 'Sin marca'}</div>
                                                                            <div><span className="font-semibold text-foreground">Minimo stock:</span> {group.minStock || 1}</div>
                                                                            <div><span className="font-semibold text-foreground">Lote:</span> {group.batch || 'STOCK-INICIAL'}</div>
                                                                            <div><span className="font-semibold text-foreground">Vence:</span> {group.expiryDate || '2099-12-31'}</div>
                                                                        </div>
                                                                        <div className="rounded-md border bg-background">
                                                                            <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                                                <ListTree className="h-4 w-4" />
                                                                                Detalle de variantes
                                                                            </div>
                                                                            <div className="overflow-x-auto">
                                                                                <table className="w-full text-sm">
                                                                                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                                                                                        <tr>
                                                                                            <th className="px-3 py-2 text-left">Talla</th>
                                                                                            <th className="px-3 py-2 text-left">Color</th>
                                                                                            <th className="px-3 py-2 text-right">Costo</th>
                                                                                            <th className="px-3 py-2 text-right">Precio venta</th>
                                                                                            <th className="px-3 py-2 text-center">Cantidad</th>
                                                                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                                                                            <th className="px-3 py-2 text-right"></th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {group.items.map((item: any) => (
                                                                                            <tr key={item.id} className="border-t first:border-t-0">
                                                                                                <td className="px-3 py-2 font-medium">{item.size || 'Sin talla'}</td>
                                                                                                <td className="px-3 py-2">{item.color || 'Sin color'}</td>
                                                                                                <td className="px-3 py-2 text-right">{currencySymbol} {item.costPriceNIO.toFixed(2)}</td>
                                                                                                <td className="px-3 py-2 text-right">{currencySymbol} {item.priceNIO.toFixed(2)}</td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <div className="flex items-center justify-center gap-1">
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            variant="outline"
                                                                                                            size="icon"
                                                                                                            className="h-6 w-6 rounded-full"
                                                                                                            onClick={() => handleUpdateQuantity(item.id, -1)}
                                                                                                            disabled={item.quantity <= 1}
                                                                                                        >-</Button>
                                                                                                        <span className="w-8 text-center font-black">{item.quantity}</span>
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            variant="outline"
                                                                                                            size="icon"
                                                                                                            className="h-6 w-6 rounded-full"
                                                                                                            onClick={() => handleUpdateQuantity(item.id, 1)}
                                                                                                        >+</Button>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-right font-bold text-primary">{currencySymbol} {(item.costPriceNIO * item.quantity).toFixed(2)}</td>
                                                                                                <td className="px-3 py-2 text-right">
                                                                                                    <div className="flex justify-end gap-1">
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            onClick={() => { setVariantDialogGroup(group); setEditingVariant(item); }}
                                                                                                            className="h-7 w-7 text-muted-foreground hover:bg-blue-100/50 hover:text-blue-600"
                                                                                                        >
                                                                                                            <Pencil className="h-4 w-4" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                            type="button"
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            onClick={() => handleRemoveItem(item.id)}
                                                                                                            className="h-7 w-7 text-muted-foreground hover:bg-red-100/50 hover:text-red-600"
                                                                                                        >
                                                                                                            <Trash2 className="h-4 w-4" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        </React.Fragment>
                                                    )})
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-40 text-center">
                                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                                <Package className="h-12 w-12 mb-2 opacity-20" />
                                                                <p>No hay productos agregados todavía.</p>
                                                                <Button 
                                                                    type="button" 
                                                                    variant="link" 
                                                                    onClick={() => setIsDialogOpen(true)}
                                                                    className="mt-2"
                                                                >
                                                                    Haga clic aquí para agregar el primero
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                                {selectedItems.length > 0 && (
                                    <div className="p-4 border-t bg-muted/20 flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {groupedItems.length} productos, {selectedItems.length} variantes/items agregados
                                        </span>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total Items</p>
                                            <p className="text-2xl font-black text-primary">{currencySymbol} {itemsTotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </form>
            </Form>

            <PurchaseItemDialog 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                onAdd={handleAddItem}
                businessMode={mode as string}
            />

            <VariantDialog
                isOpen={!!variantDialogGroup}
                onClose={() => { setVariantDialogGroup(null); setEditingVariant(null); }}
                onAdd={handleAddVariant}
                currencySymbol={currencySymbol}
                defaultCost={variantDialogGroup?.items[0]?.costPriceNIO || 0}
                defaultPrice={variantDialogGroup?.items[0]?.priceNIO || 0}
                editingItem={editingVariant}
            />

            <GroupDialog
                isOpen={!!editingGroup}
                onClose={() => setEditingGroup(null)}
                onSave={handleSaveGroup}
                editingGroup={editingGroup}
            />
        </div>
    );
}

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin", props.className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
