"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from '@/lib/dynamic'
import type { InventoryItem, Product, InventoryMovement, InventoryType } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Database, Upload, Search, Trash2, Eye, Pencil, ArrowUpDown, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from '@/lib/router-nav';
import { resolveStockStatus, isOutOfStockRow, DEFAULT_MIN_STOCK } from '@/lib/inventory-status';
import { useToast } from '@/hooks/use-toast';
import { updateInventoryItem, createInventoryItem, createInventoryMovement, getInventory } from '@/lib/actions/inventory';
import { updateProduct, createProduct, getProducts, saveRecipe } from '@/lib/actions/products';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { bulkImportInventory } from '@/lib/actions/inventory';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VariantData } from '@/components/inventory/variants-manager';

const InventoryActionDialog = dynamic(
    () => import('@/components/inventory/inventory-action-dialog').then((mod) => ({ default: mod.InventoryActionDialog })),
    { ssr: false }
);
const EditInventoryItemDialog = dynamic(
    () => import('@/components/inventory/edit-inventory-item-dialog').then((mod) => ({ default: mod.EditInventoryItemDialog })),
    { ssr: false }
);
const EditProductDialog = dynamic(
    () => import('@/components/inventory/edit-product-dialog').then((mod) => ({ default: mod.EditProductDialog })),
    { ssr: false }
);
const AddInventoryItemDialog = dynamic(
    () => import('@/components/inventory/add-inventory-item-dialog').then((mod) => ({ default: mod.AddInventoryItemDialog })),
    { ssr: false }
);
const ImportInventoryDialog = dynamic(
    () => import('@/components/inventory/import-inventory-dialog').then((mod) => ({ default: mod.ImportInventoryDialog })),
    { ssr: false }
);

const getStatusVariant = (status: InventoryItem['status']) => {
    switch (status) {
        case 'En Stock':
            return 'secondary';
        case 'Stock Bajo':
            return 'default';
        case 'Agotado':
            return 'destructive';
        default:
            return 'outline';
    }
};

const getExpiryBadgeVariant = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'destructive';
    if (diffDays <= 30) return 'destructive';
    if (diffDays <= 90) return 'default';
    return 'secondary';
};

interface InventoryClientProps {
    initialInventory?: InventoryItem[];
    initialProducts?: Product[];
    initialMovements?: InventoryMovement[];
}

export default function InventoryClient({ initialInventory, initialProducts, initialMovements }: InventoryClientProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { mode } = useBusinessMode();
    const queryClient = useQueryClient();

    const inventoryQuery = useQuery({
        queryKey: ['inventory'],
        queryFn: async () => {
            const res = await getInventory();
            return res.success ? (res.data as InventoryItem[]) : [];
        },
        initialData: initialInventory,
    });
    const productsQuery = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await getProducts();
            return res.success ? (res.data as Product[]) : [];
        },
        initialData: initialProducts,
    });
    const rawInventory = inventoryQuery.data ?? [];
    const products = productsQuery.data ?? [];

    const productsMap = useMemo(() => {
        const map = new Map<string, Product>();
        products.forEach(p => map.set(p.id, p));
        return map;
    }, [products]);

    // Replica la fusión que hacía la página servidor: filas sintéticas por variante
    const inventory = useMemo(() => {
        const variantInventory = products
            .filter((p: any) => p.variantId)
            .map((p: any) => ({
                id: p.variantId,
                productId: p.id,
                productName: p.name,
                inventoryType: p.inventoryType,
                barcode: p.barcode,
                batch: 'VARIANTE',
                quantity: p.stock || 0,
                expiryDate: 'N/A',
                status: resolveStockStatus(p.stock, p.minStock),
                variantId: p.variantId,
                parentProductId: p.parentProductId,
            })) as InventoryItem[];
        const merged = [...variantInventory, ...rawInventory];

        // El estado se evalúa SIEMPRE sobre el stock TOTAL del producto (suma de
        // todos sus lotes), nunca sobre el lote individual. Así el badge de cada
        // fila coincide con la métrica "Stock Bajo" del Dashboard y el filtro de
        // esta tabla cuenta exactamente los mismos productos.
        const totalByProduct = new Map<string, number>();
        for (const item of merged) {
            const key = item.productId || `${item.inventoryType}::${item.productName}`;
            totalByProduct.set(key, (totalByProduct.get(key) || 0) + (item.quantity || 0));
        }

        return merged.map((item: any) => {
            const key = item.productId || `${item.inventoryType}::${item.productName}`;
            const minStock = productsMap.get(item.productId)?.minStock ?? item.minStock ?? DEFAULT_MIN_STOCK;
            return { ...item, status: resolveStockStatus(totalByProduct.get(key) || 0, minStock) };
        });
    }, [products, rawInventory, productsMap]);

    // Escribe al caché de React Query; descarta filas sintéticas de variantes para mantener el caché limpio
    const writeBaseInventory = (next: InventoryItem[]) =>
        queryClient.setQueryData<InventoryItem[]>(['inventory'], next.filter((i: any) => !i.variantId));
    const setInventory = (valueOrUpdater: any) => {
        const base = typeof valueOrUpdater === 'function'
            ? valueOrUpdater(rawInventory)
            : valueOrUpdater;
        if (Array.isArray(base)) writeBaseInventory(base);
    };
    const setProducts = (valueOrUpdater: any) =>
        queryClient.setQueryData<Product[]>(['products'], (old) =>
            typeof valueOrUpdater === 'function' ? valueOrUpdater(old ?? []) : valueOrUpdater
        );
    const [movements, setMovements] = useState<InventoryMovement[]>(initialMovements ?? []);
    const [searchTerm, setSearchTerm] = useState('');
    // Estado inicial tomado de la URL. Acepta ?filter=low-stock, ?status=low-stock
    // y ?filtro=stock-bajo para que la tarjeta del Dashboard (/inventory?filter=low-stock)
    // abra la vista ya filtrada.
    const searchParams = useSearchParams();
    const [statusFilter, setStatusFilter] = useState(() => {
        const valor = [
            searchParams.get('filter'),
            searchParams.get('status'),
            searchParams.get('filtro'),
        ].find(Boolean);
        if (!valor) return 'all';
        switch (valor) {
            case 'low-stock':
            case 'stock-bajo':
                return 'Stock Bajo';
            case 'agotado':
            case 'out-of-stock':
                return 'Agotado';
            case 'en-stock':
                return 'En Stock';
            default:
                return 'all';
        }
    });
    const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'all' | InventoryType>('all');
    const [showOutOfStock, setShowOutOfStock] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [dialogAction, setDialogAction] = useState<'edit' | 'adjust' | 'edit-product' | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Inventarios visibles para el usuario actual
    const allowedInventoryTypes = useMemo<InventoryType[]>(() => {
        if (user?.role === 'dispatcher' && user.inventoryType) return [user.inventoryType];
        return ['pharmacy', 'general', 'jewelry'];
    }, [user]);

    const filteredInventory = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();

        // Búsqueda + tipos permitidos + tipo de inventario. El switch de agotados
        // NO se aplica aquí a propósito: la tabla muestra filas consolidadas
        // (suma de lotes), así que la regla debe evaluarse sobre la fila final.
        return inventory
            .filter(item => allowedInventoryTypes.includes(item.inventoryType)) // Filter by user's allowed inventory
            .filter((item) => {
                const searchLower = lowercasedSearchTerm;
                const matchesBase = item.productName.toLowerCase().includes(searchLower) ||
                    item.batch.toLowerCase().includes(searchLower) ||
                    (item.barcode && item.barcode.includes(searchLower));

                if (matchesBase) return true;

                if ((mode as string) === 'BOUTIQUE') {
                    const p = productsMap.get(item.productId);
                    if (p) {
                        return (p.brand?.toLowerCase().includes(searchLower) ||
                            p.size?.toLowerCase().includes(searchLower) ||
                            p.color?.toLowerCase().includes(searchLower));
                    }
                }
                return false;
            })
            .filter(item =>
                inventoryTypeFilter === 'all' ? true : item.inventoryType === inventoryTypeFilter
            )
            .sort((a, b) => a.productName.localeCompare(b.productName));
    }, [inventory, searchTerm, allowedInventoryTypes, inventoryTypeFilter, productsMap, mode]);

    /**
     * Aplica el switch "Mostrar lotes agotados" y el selector de estado sobre la
     * fila FINAL de la tabla. El switch tiene prioridad: apagado, NINGÚN producto
     * con cantidad <= 0 (agotados y saldos negativos) puede verse, sin importar el
     * filtro elegido.
     */
    const applyStockRowFilters = <T extends { status?: string | null }>(rows: T[]): T[] =>
        rows.filter((row) => {
            if (!showOutOfStock && isOutOfStockRow(row as any)) return false;
            if (statusFilter === 'all') return true;
            // "Stock Bajo" incluye también los agotados: ambos necesitan
            // reabastecimiento y ambos cuentan en la métrica del Dashboard.
            // Con el switch apagado los agotados ya se descartaron arriba.
            if (statusFilter === 'Stock Bajo') {
                return row.status === 'Stock Bajo' || row.status === 'Agotado';
            }
            return row.status === statusFilter;
        });

    const groupedInventory = useMemo(() => {
        if (mode !== 'BOUTIQUE') return filteredInventory;

        const groups = new Map<string, any>();

        filteredInventory.forEach(item => {
            const p = productsMap.get(item.productId);
            const isVariant = !!item.parentProductId || !!(p as any)?.parentProductId;
            const parentId = item.parentProductId || (p as any)?.parentProductId;
            
            const groupKey = parentId || item.productId || item.productName;
            const existing = groups.get(groupKey);

            if (!existing) {
                groups.set(groupKey, {
                    id: groupKey,
                    productName: isVariant ? (p as any)?.parentName || item.productName.split(' - ')[0] : item.productName,
                    barcode: isVariant ? (products.find(prod => prod.id === parentId)?.barcode || item.barcode) : item.barcode,
                    brand: p?.brand || '',
                    category: p?.category || '',
                    totalQuantity: item.quantity,
                    hasVariants: isVariant,
                    items: [item],
                    minStock: p?.minStock || 5,
                    priceNIO: p?.priceNIO || 0,
                    imageUrl: p?.imageUrl || '',
                    batch: isVariant ? 'Múltiples' : item.batch,
                    parentProductId: parentId,
                });
            } else {
                existing.totalQuantity += item.quantity;
                existing.hasVariants = existing.hasVariants || isVariant;
                existing.items.push(item);
            }
        });

        return Array.from(groups.values()).map((group) => {
            const totalQuantity = group.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
            // `status` es a nivel de producto (stock total vs minStock), así que
            // todos los lotes/variantes del grupo lo comparten: se toma el del
            // primer ítem para que el filtro de estado y el badge coincidan.
            return {
                ...group,
                totalQuantity,
                quantity: totalQuantity,
                status: group.items[0]?.status,
            };
        });
    }, [filteredInventory, mode, productsMap, products]);

    // Fila consolidada: el switch y el estado se aplican sobre la fila ya sumada.
    const visibleGroupedInventory = useMemo(
        () => (mode === 'BOUTIQUE' ? applyStockRowFilters(groupedInventory) : groupedInventory),
        [groupedInventory, mode, showOutOfStock, statusFilter]
    );

    // Consolidación para la tabla normal (no boutique): los lotes genéricos
    // (STOCK-INICIAL / N/A / vacíos) de un mismo producto se agrupan en una sola
    // fila con la suma total de existencias. Los lotes específicos se mantienen
    // separados porque tienen datos de vencimiento propios.
    const consolidatedInventory = useMemo(() => {
        if (mode === 'BOUTIQUE') return filteredInventory;

        const isGenericBatch = (b: string) => {
            const up = (b || '').trim().toUpperCase();
            return !up || up === 'STOCK-INICIAL' || up === 'N/A' || up === 'NA' || up === 'SIN LOTE' || up === 'GENERICO' || b === 'VARIANTE';
        };

        const groups = new Map<string, any>();

        filteredInventory.forEach(item => {
            const key = item.productId || `${item.inventoryType}::${item.productName}`;
            const generic = isGenericBatch(item.batch);

            if (generic) {
                const existing = groups.get(key);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.quantity = existing.quantity; // keep as number
                    // El estado general del grupo se recalcula abajo con el stock total.
                    existing.items.push(item);
                    return;
                }
                groups.set(key, { ...item, quantity: item.quantity, items: [item] });
            } else {
                // Lote específico: siempre fila propia.
                groups.set(`spec:${item.id}:${item.productId}`, { ...item, items: [item] });
            }
        });

        return Array.from(groups.values()).map(g => {
            // El status ya viene normalizado a nivel de producto (stock total vs
            // minStock) en `inventory`; se reutiliza el de la primera fila del
            // grupo para que el badge coincida con la métrica del Dashboard.
            return { ...g, quantity: g.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0), status: g.status, lastItem: g.items[g.items.length - 1] };
        });
    }, [filteredInventory, mode, productsMap]);

    // Fila consolidada: el switch y el estado se aplican sobre la fila ya sumada.
    const visibleConsolidatedInventory = useMemo(
        () => (mode === 'BOUTIQUE' ? consolidatedInventory : applyStockRowFilters(consolidatedInventory)),
        [consolidatedInventory, mode, showOutOfStock, statusFilter]
    );

    // Conteo REAL de registros agotados (cantidad <= 0). Se mide sobre las mismas
    // filas que la tabla muestra — en BOUTIQUE grupos, en el resto lotes
    // consolidados — de modo que (N) coincide exactamente con cuántos registros
    // agotados hay y cuántos aparecen al activar el switch.
    const outOfStockCount = useMemo(() => {
        const rows: any[] = mode === 'BOUTIQUE' ? visibleGroupedInventory : visibleConsolidatedInventory;
        return rows.filter(isOutOfStockRow).length;
    }, [visibleGroupedInventory, visibleConsolidatedInventory, mode]);

    // Al llegar desde la tarjeta "Productos Stock Bajo" del Dashboard se activa el
    // switch de agotados si hay registros agotados, para que también se vean los
    // productos que necesitan reabastecimiento urgente. Se hace una sola vez por montaje.
    const autoOutOfStockRef = useRef(false);
    useEffect(() => {
        if (statusFilter !== 'Stock Bajo' || autoOutOfStockRef.current) return;
        if (inventory.length === 0) return; // datos aún cargando
        autoOutOfStockRef.current = true;
        if (outOfStockCount > 0) setShowOutOfStock(true);
    }, [statusFilter, inventory.length, outOfStockCount]);

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const handleItemUpdate = async (updatedItem: InventoryItem) => {
        // Optimistic update
        const originalItem = inventory.find(item => item.id === updatedItem.id);
        if (!originalItem) return;

        const newInventory = inventory.map(item => {
            if (item.id === updatedItem.id) {
                const product = products.find(p => p.id === updatedItem.productId);
                const newStatus = resolveStockStatus(updatedItem.quantity, product?.minStock ?? DEFAULT_MIN_STOCK);
                return { ...updatedItem, status: newStatus };
            }
            return item;
        });
        setInventory(newInventory);

        // Server update
        try {
            await updateInventoryItem(updatedItem.id, {
                quantity: updatedItem.quantity,
                batch: updatedItem.batch,
                expiryDate: updatedItem.expiryDate,
                // status is updated by server logic usually, but we can pass it if needed or let server handle it
            });

            if (dialogAction === 'adjust' && user) {
                const quantityChange = updatedItem.quantity - originalItem.quantity;
                if (quantityChange !== 0) {
                    // Create movement record
                    await createInventoryMovement({
                        productId: updatedItem.productId,
                        productName: updatedItem.productName,
                        movementType: 'Ajuste',
                        quantityChange: quantityChange,
                        previousQuantity: originalItem.quantity,
                        newQuantity: updatedItem.quantity,
                        user: user.id,
                        inventoryType: updatedItem.inventoryType
                    });
                }
            }
            toast({ title: "Inventario actualizado" });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (error) {
            console.error("Failed to update inventory", error);
            toast({ title: "Error al actualizar inventario", variant: "destructive" });
            // Revert optimistic update if needed
        }

        setSelectedItem(null);
        setDialogAction(null);
    };

    const handleProductUpdate = async (updatedProductData: Product & { quantity: number; batch: string; expiryDate: string; type?: string; recipeItems?: Array<{ ingredientId: string; quantity: number; unit: string }> }) => {
        // Optimistic update
        const updatedProducts = products.map(p =>
            p.id === updatedProductData.id ? { ...p, ...updatedProductData } : p
        );
        setProducts(updatedProducts);

        const updatedInventoryItems = inventory.map(i => {
            if (i.id === selectedItem?.id) {
                return {
                    ...i,
                    productName: updatedProductData.name,
                    quantity: updatedProductData.quantity,
                    batch: updatedProductData.batch,
                    expiryDate: updatedProductData.expiryDate,
                    barcode: updatedProductData.barcode,
                    inventoryType: updatedProductData.inventoryType,
                };
            }
            return i;
        });
        setInventory(updatedInventoryItems);

        // Server update
        try {
            await updateProduct(updatedProductData.id, {
                name: updatedProductData.name,
                type: updatedProductData.type ?? (updatedProductData as any).type ?? 'STANDARD',
                priceNIO: updatedProductData.priceNIO,
                costPriceNIO: updatedProductData.costPriceNIO,
                category: updatedProductData.category,
                categoryId: (updatedProductData as any).categoryId,
                inventoryType: updatedProductData.inventoryType,
                unitOfMeasure: updatedProductData.unitOfMeasure,
                minStock: updatedProductData.minStock,
                allowNegativeStock: (updatedProductData as any).allowNegativeStock === true,
                barcode: updatedProductData.barcode,
                brand: updatedProductData.brand,
                size: updatedProductData.size,
                color: updatedProductData.color,
                gender: updatedProductData.gender,
                imageUrl: (updatedProductData as any).imageUrl,
                purchaseCurrency: (updatedProductData as any).purchaseCurrency,
                originalPrice: (updatedProductData as any).originalPrice,
                price2: (updatedProductData as any).price2 ?? null,
                price3: (updatedProductData as any).price3 ?? null,
                price4: (updatedProductData as any).price4 ?? null,
                hasBoxOption: (updatedProductData as any).hasBoxOption ?? false,
                unitsPerBox: (updatedProductData as any).unitsPerBox ?? null,
                boxPrice: (updatedProductData as any).boxPrice ?? null,
                isFractional: (updatedProductData as any).isFractional ?? false,
                trackInventory: (updatedProductData as any).trackInventory ?? true,
                bulkUnit: (updatedProductData as any).bulkUnit ?? null,
                unitsPerBulk: (updatedProductData as any).unitsPerBulk ?? null,
                bulkUnit2: (updatedProductData as any).bulkUnit2 ?? null,
                unitsPerBulk2: (updatedProductData as any).unitsPerBulk2 ?? null,
                bulkUnit3: (updatedProductData as any).bulkUnit3 ?? null,
                unitsPerBulk3: (updatedProductData as any).unitsPerBulk3 ?? null,
                baseUnit: (updatedProductData as any).baseUnit ?? null,
                hasExtraDetails: (updatedProductData as any).hasExtraDetails ?? false,
                description2: (updatedProductData as any).description2 ?? null,
                description3: (updatedProductData as any).description3 ?? null,
            } as any);

            if (selectedItem) {
                await updateInventoryItem(selectedItem.id, {
                    quantity: updatedProductData.quantity,
                    batch: updatedProductData.batch,
                    expiryDate: updatedProductData.expiryDate,
                    barcode: updatedProductData.barcode,
                    productName: updatedProductData.name,
                    inventoryType: updatedProductData.inventoryType
                });
            }

            // RECETAS (BOM): guardar insumos del platillo (o limpiar si se dejó sin receta).
            if (updatedProductData.type === 'RECIPE_ITEM') {
                const recipeRes = await saveRecipe(updatedProductData.id, (updatedProductData.recipeItems ?? []));
                if (!recipeRes.success) {
                    console.error("No se pudo guardar la receta:", recipeRes.error);
                    toast({
                        title: "Receta no guardada",
                        variant: "destructive",
                        description: recipeRes.error || 'Ocurrió un error al guardar la receta.',
                    });
                }
            }

            toast({ title: "Producto actualizado" });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (error) {
            console.error("Failed to update product", error);
            toast({ title: "Error al actualizar producto", variant: "destructive" });
        }

        setSelectedItem(null);
        setDialogAction(null);
    };

    const handleAddItem = async (newItemData: Omit<InventoryItem, 'id' | 'status' | 'productId' | 'parentProductId' | 'variantId'> & { 
        priceNIO: number; 
        costPriceNIO: number; 
        minStock: number; 
        unitOfMeasure: 'unit' | 'bulk' | 'box' | 'blister'; 
        category: string; 
        barcode?: string;
        inventoryType: 'pharmacy' | 'general';
        brand?: string;
        size?: string;
        color?: string;
        gender?: string;
        purchaseCurrency: 'NIO' | 'USD';
        originalPrice: number;
        price2?: number | null;
        price3?: number | null;
        price4?: number | null;
        hasVariants?: boolean;
        variantsData?: VariantData[];
        type?: 'STANDARD' | 'INGREDIENT' | 'RECIPE_ITEM';
        recipeItems?: Array<{ ingredientId: string; quantity: number; unit: string }>;
    }): Promise<{ success: boolean; error?: string }> => {
        try {
            let product;
            if (newItemData.hasVariants) {
                product = null;
            } else if (mode === 'BOUTIQUE') {
                product = products.find(p => 
                    p.name.toLowerCase() === newItemData.productName.toLowerCase() &&
                    (p.size || '').toLowerCase() === (newItemData.size || '').toLowerCase() &&
                    (p.color || '').toLowerCase() === (newItemData.color || '').toLowerCase()
                );
            } else {
                product = products.find(p => p.name.toLowerCase() === newItemData.productName.toLowerCase());
            }
            let productId = product?.id;

            if (!product) {
                const newProductResult = await createProduct({
                    name: newItemData.productName,
                    type: newItemData.type ?? 'STANDARD',
                    priceNIO: newItemData.priceNIO,
                    costPriceNIO: newItemData.costPriceNIO || 0,
                    minStock: newItemData.minStock,
                    unitOfMeasure: newItemData.unitOfMeasure,
                    category: newItemData.category,
                    inventoryType: newItemData.inventoryType,
                    barcode: newItemData.barcode || null,
                    imageUrl: null,
                    imageHint: null,
                    categoryId: (newItemData as any).categoryId || null,
                    brand: newItemData.brand || null,
                    size: newItemData.size || null,
                    color: newItemData.color || null,
                    gender: newItemData.gender || null,
                    purchaseCurrency: newItemData.purchaseCurrency,
                    originalPrice: newItemData.originalPrice,
                    price2: newItemData.price2 ?? null,
                    price3: newItemData.price3 ?? null,
                    price4: newItemData.price4 ?? null,
                    bulkUnit: (newItemData as any).bulkUnit ?? null,
                    unitsPerBulk: (newItemData as any).unitsPerBulk ?? null,
                    bulkUnit2: (newItemData as any).bulkUnit2 ?? null,
                    unitsPerBulk2: (newItemData as any).unitsPerBulk2 ?? null,
                    bulkUnit3: (newItemData as any).bulkUnit3 ?? null,
                    unitsPerBulk3: (newItemData as any).unitsPerBulk3 ?? null,
                    unitsPerBox: (newItemData as any).unitsPerBox ?? null,
                    boxPrice: (newItemData as any).boxPrice ?? null,
                    hasBoxOption: Boolean((newItemData as any).hasBoxOption) || undefined,
                    isFractional: (newItemData as any).isFractional ?? false,
                    trackInventory: (newItemData as any).trackInventory ?? true,
                    baseUnit: (newItemData as any).baseUnit ?? null,
                    hasExtraDetails: (newItemData as any).hasExtraDetails ?? false,
                    description2: (newItemData as any).description2 ?? null,
                    description3: (newItemData as any).description3 ?? null,
                    hasVariants: Boolean(newItemData.hasVariants),
                    variantsData: newItemData.variantsData,
                } as any);
                if (newProductResult.success && newProductResult.data) {
                    const newProduct = newProductResult.data as unknown as Product;
                    product = newProduct;
                    productId = newProduct.id;
                    setProducts([...products, newProduct]);

                    // RECETAS (BOM): guardar insumos del platillo si el módulo está activo.
                    if (newItemData.type === 'RECIPE_ITEM' && newItemData.recipeItems && newItemData.recipeItems.length > 0) {
                        const recipeRes = await saveRecipe(newProduct.id, newItemData.recipeItems);
                        if (!recipeRes.success) {
                            console.error("No se pudo guardar la receta:", recipeRes.error);
                            toast({
                                title: "Receta no guardada",
                                variant: "destructive",
                                description: recipeRes.error || 'Ocurrió un error al guardar la receta.',
                            });
                        }
                    }
                } else {
                    throw new Error("Failed to create product");
                }
            }

            if (newItemData.hasVariants) {
                toast({ title: "Producto con variantes creado" });
            } else if (productId) {
                const newInventoryItemResult = await createInventoryItem({
                    productId: productId,
                    productName: newItemData.productName,
                    barcode: newItemData.barcode || null,
                    inventoryType: newItemData.inventoryType,
                    batch: newItemData.batch,
                    quantity: newItemData.quantity,
                    expiryDate: newItemData.expiryDate,
                    status: resolveStockStatus(newItemData.quantity, productsMap.get(productId)?.minStock ?? DEFAULT_MIN_STOCK)
                });

                if (!newInventoryItemResult.success) {
                    console.error("Error al crear artículo de inventario:", newInventoryItemResult.error, (newInventoryItemResult as any).details);
                    toast({
                        title: "Error al añadir artículo de inventario",
                        variant: "destructive",
                        description: newInventoryItemResult.error || 'Ocurrió un error inesperado.',
                    });
                    return { success: false, error: newInventoryItemResult.error };
                }

                if (newInventoryItemResult.success && newInventoryItemResult.data) {
                    setInventory([...inventory, newInventoryItemResult.data as any]); // Cast if needed
                    toast({ title: "Artículo añadido al inventario" });
                }
            }
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            return { success: true };
        } catch (error) {
            console.error("Error adding item:", error);
            toast({
                title: "Error al añadir artículo",
                variant: "destructive",
                description: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
            });
            return { success: false, error: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' };
        }
    };

    const openActionDialog = (item: InventoryItem) => {
        setSelectedItem(item);
    };

    const closeDialogs = () => {
        setSelectedItem(null);
        setDialogAction(null);
    };

    const currentProduct = useMemo(() => {
        if (!selectedItem) return null;
        return productsMap.get(selectedItem.productId) || null;
    }, [selectedItem, productsMap]);

    const handleImport = async (data: any[], mode: 'create' | 'update') => {
        try {
            const result = await bulkImportInventory(data, mode, 'import.xlsx', user?.id);
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['inventory'] });
                queryClient.invalidateQueries({ queryKey: ['products'] });
                // Refresh local state or just reload the page to be safe
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Import failed:", error);
            toast({ title: "Error en la importación", variant: "destructive" });
        }
    };


    return (
        <>
            <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden space-y-6">
                <div className="shrink-0">
                    <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">Gestión de Inventario</h1>
                    <p className="text-muted-foreground text-sm">
                        {mode === 'PHARMACY' ? 'Rastree y gestione el stock de su farmacia.' : mode === 'JEWELRY' ? 'Rastree y gestione el stock de su joyería.' : mode === 'DISTRIBUIDORA' ? 'Gestión de stock para distribuidora: productos varios y control de inventario.' : 'Gestión de stock para boutique: ropa, zapatos y accesorios.'}
                    </p>
                </div>

                <Card className="flex flex-1 min-h-0 flex-col border-none shadow-sm overflow-hidden">
                    <CardHeader className="shrink-0 border-b bg-muted/5 p-4 md:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-xl">Stock de Productos</CardTitle>
                                <CardDescription className="text-xs md:text-sm">
                                    {(mode as string) === 'BOUTIQUE' ? 'Vea niveles de inventario por talla, color y marca.' : 'Vea los niveles de inventario actuales en todos los lotes.'}
                                </CardDescription>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                                <div className="relative flex-1 md:w-[240px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar productos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 h-9"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none h-9 px-2 rounded-md hover:bg-muted/40">
                                        <Switch
                                            checked={showOutOfStock}
                                            onCheckedChange={setShowOutOfStock}
                                        />
                                        Mostrar lotes agotados <span className="text-[10px] text-muted-foreground/70">({outOfStockCount})</span>
                                    </label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-9 w-[130px]">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="En Stock">En Stock</SelectItem>
                                            <SelectItem value="Stock Bajo">Stock Bajo</SelectItem>
                                            <SelectItem value="Agotado">Agotado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {user?.role === 'admin' && (
                                        <Select value={inventoryTypeFilter} onValueChange={(val) => setInventoryTypeFilter(val as any)}>
                                            <SelectTrigger className="h-9 w-[130px]">
                                                <SelectValue placeholder="Inventario" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="pharmacy">Farmacia</SelectItem>
                                                <SelectItem value="general">General</SelectItem>
                                                <SelectItem value="jewelry">Joyería</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm" className="h-9">
                                        <Upload className="mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline">Importar</span>
                                    </Button>
                                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        <span>Nuevo</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                        {mode === 'BOUTIQUE' ? (
                            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                                <div className="inline-block min-w-full align-middle">
                                    <Table className="min-w-[1000px]">
                                        <TableHeader className="sticky top-0 z-10 bg-[#343a40]">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="w-[40px]"></TableHead>
                                                <TableHead className="text-white font-bold w-[40px] text-center">#</TableHead>
                                                <TableHead className="text-white font-bold w-[80px] text-center">Imágen</TableHead>
                                                <TableHead className="text-white font-bold w-[130px]">Referencia</TableHead>
                                                <TableHead className="text-white font-bold w-[130px]">Código</TableHead>
                                                <TableHead className="text-white font-bold min-w-[250px]">Producto</TableHead>
                                                <TableHead className="text-white font-bold text-center w-[100px]">Stock</TableHead>
                                                <TableHead className="text-white font-bold text-center w-[100px]">Precio</TableHead>
                                                <TableHead className="text-white font-bold text-center w-[150px]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {visibleGroupedInventory.length > 0 ? (
                                            visibleGroupedInventory.map((group, index) => {
                                                    const isExpanded = expandedGroups[group.id] ?? false;
                                                    
                                                    return (
                                                        <React.Fragment key={group.id}>
                                                            <TableRow className="hover:bg-muted/50 transition-colors group">
                                                                <TableCell className="p-2">
                                                                    {group.hasVariants && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                                                        >
                                                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>
                                                                <TableCell className="p-2">
                                                                    <div className="flex justify-center items-center h-10 w-10 mx-auto bg-muted rounded-full overflow-hidden border">
                                                                        {group.imageUrl ? (
                                                                            <img src={group.imageUrl} alt={group.productName} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <Package className="h-5 w-5 text-muted-foreground/50" />
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-medium text-sm">{group.batch || '-'}</TableCell>
                                                                <TableCell className="text-sm">{group.barcode || '-'}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-xs uppercase tracking-tight line-clamp-1">{group.productName}</span>
                                                                        <div className="flex gap-1 flex-wrap mt-1">
                                                                            {group.brand && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{group.brand}</Badge>}
                                                                            {group.category && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{group.category}</Badge>}
                                                                            {group.hasVariants && <Badge className="text-[9px] px-1 py-0 h-4">{group.items.length} variantes</Badge>}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold text-sm">
                                                                    <span className={group.totalQuantity <= group.minStock ? "text-destructive" : "text-foreground"}>
                                                                        {group.totalQuantity}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm font-medium">
                                                                    C$ {group.priceNIO?.toFixed(2) || '0.00'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex justify-center items-center gap-1.5">
                                                                        {!group.hasVariants && (
                                                                            <>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white" onClick={() => openActionDialog(group.items[0])}>
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-600 hover:bg-slate-700 text-white" onClick={() => { setSelectedItem(group.items[0]); setDialogAction('adjust'); }}>
                                                                                    <Database className="h-4 w-4" />
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setSelectedItem(group.items[0]); setDialogAction('edit-product'); }}>
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90 text-white">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                            {isExpanded && group.hasVariants && (
                                                                <TableRow className="bg-muted/10 hover:bg-muted/10 border-t-0">
                                                                    <TableCell colSpan={9} className="p-0 border-b">
                                                                        <div className="p-4 bg-muted/20 inset-shadow-sm">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left font-semibold">Talla</th>
                                                                                        <th className="px-3 py-2 text-left font-semibold">Color</th>
                                                                                        <th className="px-3 py-2 text-left font-semibold">Código</th>
                                                                                        <th className="px-3 py-2 text-right font-semibold">Precio</th>
                                                                                        <th className="px-3 py-2 text-center font-semibold">Stock</th>
                                                                                        <th className="px-3 py-2 text-center font-semibold">Acciones</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-border/30">
                                                                                    {group.items.map((item: any) => {
                                                                                        const vp = productsMap.get(item.productId);
                                                                                        return (
                                                                                            <tr key={item.id} className="hover:bg-background/50 transition-colors">
                                                                                                <td className="px-3 py-2 font-medium">{vp?.size || '-'}</td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        {vp?.color && (
                                                                                                            <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: vp.color.toLowerCase() }}></div>
                                                                                                        )}
                                                                                                        {vp?.color || '-'}
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-3 py-2 font-mono text-xs">{item.barcode || '-'}</td>
                                                                                                <td className="px-3 py-2 text-right">C$ {vp?.priceNIO?.toFixed(2) || '0.00'}</td>
                                                                                                <td className="px-3 py-2 text-center">
                                                                                                    <Badge variant="outline" className={item.quantity <= (vp?.minStock || 0) ? "border-red-200 bg-red-50 text-red-700" : ""}>
                                                                                                        {item.quantity} unds
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <div className="flex justify-center items-center gap-1">
                                                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-sky-600 hover:bg-sky-100" onClick={() => openActionDialog(item)}>
                                                                                                            <Eye className="h-3 w-3" />
                                                                                                        </Button>
                                                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-slate-200" onClick={() => { setSelectedItem(item); setDialogAction('adjust'); }}>
                                                                                                            <Database className="h-3 w-3" />
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                                        No se encontraron productos en el inventario.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                                <Table className="min-w-[800px]">
                                    <TableHeader className="sticky top-0 z-10 bg-white">
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Código</TableHead>
                                            {user?.role === 'admin' && <TableHead>Inventario</TableHead>}
                                            <TableHead>Lote</TableHead>
                                            <TableHead className="text-right">Cantidad</TableHead>
                                            <TableHead>Vencimiento</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleConsolidatedInventory.length > 0 ? (
                                            visibleConsolidatedInventory.map((item) => (
                                                <TableRow key={item.id + (item.batch || '') + (item.quantity || 0)} onClick={() => openActionDialog(item.lastItem || item)} className="cursor-pointer hover:bg-muted/50">
                                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                                    <TableCell className="text-xs">{item.barcode}</TableCell>
                                                    {user?.role === 'admin' && (
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] uppercase">{item.inventoryType}</Badge>
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-xs">{item.items && item.items.length > 1 ? 'Consolidado' : item.batch}</TableCell>
                                                    <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                                    <TableCell>
                                                        {item.items && item.items.length > 1
                                                            ? <Badge variant="outline" className="text-[10px]">Múltiples</Badge>
                                                            : <Badge variant={getExpiryBadgeVariant(item.expiryDate)} className="text-[10px]">{item.expiryDate}</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusVariant(item.status)} className="text-[10px]">{item.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                                <TableRow>
                                                    <TableCell colSpan={user?.role === 'admin' ? 7 : 6} className="h-32 text-center text-muted-foreground">
                                                        Sin resultados.
                                                        {!showOutOfStock && outOfStockCount > 0 && (
                                                            <div className="mt-2 text-xs text-muted-foreground/80">
                                                                Hay {outOfStockCount} registro{outOfStockCount === 1 ? '' : 's'} agotado{outOfStockCount === 1 ? '' : 's'} oculto{outOfStockCount === 1 ? '' : 's'}. Activa
                                                                &quot;Mostrar lotes agotados&quot; para verlos.
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedItem && !dialogAction && (
                <InventoryActionDialog
                    isOpen={!!selectedItem && !dialogAction}
                    onClose={closeDialogs}
                    onEdit={() => setDialogAction('edit-product')}
                    onAdjust={() => setDialogAction('adjust')}
                    productName={selectedItem.productName}
                />
            )}
            {selectedItem && dialogAction === 'adjust' && (
                <EditInventoryItemDialog
                    item={selectedItem}
                    isOpen={dialogAction === 'adjust'}
                    onClose={closeDialogs}
                    onSave={handleItemUpdate}
                    mode='adjust'
                />
            )}
            {selectedItem && currentProduct && dialogAction === 'edit-product' && (
                <EditProductDialog
                    product={currentProduct}
                    inventoryItem={selectedItem}
                    isOpen={dialogAction === 'edit-product'}
                    onClose={closeDialogs}
                    onSave={handleProductUpdate}
                    existingProducts={products}
                />
            )}
            <AddInventoryItemDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSave={handleAddItem}
                existingProducts={products}
            />
            <ImportInventoryDialog
                isOpen={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                onImport={handleImport}
            />
        </>
    );
}
