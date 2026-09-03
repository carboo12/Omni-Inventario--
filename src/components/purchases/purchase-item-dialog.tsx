'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Plus, Loader2, Package, LayoutGrid, Folder, FolderOpen, ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { getProducts } from '@/lib/actions/products';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PurchaseItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: any) => void;
    businessMode?: string;
}

export function PurchaseItemDialog({ isOpen, onClose, onAdd, businessMode }: PurchaseItemDialogProps) {
    const isBoutique = businessMode === 'BOUTIQUE';
    console.log("CACHE BUSTER 1 - Ignorar esto");
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        productName: '',
        barcode: '',
        category: '',
        size: '',
        color: '',
        brand: '',
        costPriceNIO: 0,
        priceNIO: 0,
        price2: 0,
        price3: 0,
        price4: 0,
        quantity: 1,
        batch: '',
        expiryDate: '2099-12-31',
        minStock: 1,
        presentation: 'unit' as 'unit' | 'box',
        boxUnitsPerBox: 1,
        isFractional: false,
        bulkUnit: 'qtl',
        baseUnit: 'lb',
    });

    const [viewMode, setViewMode] = useState<'search' | 'folders'>('search');
    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            fetchCategories();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const result = await getProducts();
            setProducts((result && result.success) ? (result.data || []) : []);
        } catch (error) {
            console.error('Error cargando productos para compra:', error);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { getCategories } = await import('@/lib/actions/categories');
            const res = await getCategories();
            setCategories((res && res.success) ? (res.data || []) : []);
        } catch (error) {
            console.error('Error cargando categorias para compra:', error);
            setCategories([]);
        }
    };

    // Attribute Navigation Logic
    const getCategory = (id: string | null) => categories.find(c => c.id === id);

    const folderViewContent = React.useMemo(() => {
        if (viewMode !== 'folders') return null;

        const currentCategoryObj = getCategory(currentCategoryId);
        
        // 1. Get products in current category level
        let productsInLevel = products.filter(p => {
            if (currentCategoryObj) {
                return p.categoryId === currentCategoryId || p.category === currentCategoryObj.name;
            } else {
                return !p.categoryId && !categories.some(c => c.name === p.category);
            }
        });

        // 2. Filter categories in current level
        const categoriesInLevel = categories.filter(c => c.parentId === currentCategoryId);

        // 3. Logic for Attributes (Size/Color)
        if (currentCategoryId && categoriesInLevel.length === 0) {
            // Check for Size Level
            if (!selectedSize) {
                const distinctSizes = Array.from(new Set(productsInLevel.map(p => p.size || 'Sin Talla')));
                const hasRealSizes = distinctSizes.length > 1 || (distinctSizes.length === 1 && distinctSizes[0] !== 'Sin Talla');

                if (hasRealSizes) {
                    return { type: 'folders' as const, attrType: 'size' as const, values: distinctSizes };
                }
            }

            // Filter by selected size if applicable
            if (selectedSize) {
                productsInLevel = productsInLevel.filter(p => (p.size || 'Sin Talla') === selectedSize);
            }

            // Check for Color Level
            if (!selectedColor) {
                const distinctColors = Array.from(new Set(productsInLevel.map(p => p.color || 'Sin Color')));
                const hasRealColors = distinctColors.length > 1 || (distinctColors.length === 1 && distinctColors[0] !== 'Sin Color');

                if (hasRealColors) {
                    return { type: 'folders' as const, attrType: 'color' as const, values: distinctColors };
                }
            }

            // Filter by selected color if applicable
            if (selectedColor) {
                productsInLevel = productsInLevel.filter(p => (p.color || 'Sin Color') === selectedColor);
            }
        }

        return {
            type: 'navigation' as const,
            categories: categoriesInLevel,
            products: productsInLevel
        };
    }, [viewMode, products, categories, currentCategoryId, selectedSize, selectedColor]);

    const breadcrumbs = React.useMemo(() => {
        const path: Array<{ id: string | null; name: string; type?: 'cat' | 'size' | 'color' }> = [];
        path.push({ id: null, name: 'Inicio' });

        if (currentCategoryId) {
            const catPath: any[] = [];
            let curr = getCategory(currentCategoryId);
            while (curr) {
                catPath.unshift({ id: curr.id, name: curr.name, type: 'cat' });
                curr = curr.parentId ? getCategory(curr.parentId) : undefined;
            }
            path.push(...catPath);
        }

        if (selectedSize) path.push({ id: 'size', name: selectedSize, type: 'size' });
        if (selectedColor) path.push({ id: 'color', name: selectedColor, type: 'color' });

        return path;
    }, [currentCategoryId, categories, selectedSize, selectedColor]);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchTerm))
    );

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        const parentProductName = product.parentName || product.name;
        setFormData({
            ...formData,
            productName: parentProductName,
            barcode: product.barcode || '',
            category: product.category || '',
            size: product.size || '',
            color: product.color || '',
            brand: product.brand || '',
            costPriceNIO: product.costPriceNIO || 0,
            priceNIO: product.priceNIO || 0,
            price2: product.price2 || 0,
            price3: product.price3 || 0,
            price4: product.price4 || 0,
            minStock: product.minStock || 1,
            presentation: 'unit' as 'unit' | 'box',
            boxUnitsPerBox: product.unitsPerBox || 1,
            isFractional: Boolean(product.isFractional),
            bulkUnit: product.bulkUnit || 'qtl',
            baseUnit: product.baseUnit || 'lb',
        });
    };

    const handleAddNew = () => {
        setSelectedProduct({ id: 'NEW' });
        setFormData({
            ...formData,
            productName: searchTerm,
            barcode: '',
            category: '',
            size: '',
            color: '',
            brand: '',
            costPriceNIO: 0,
            priceNIO: 0,
            quantity: 1,
            batch: '',
            expiryDate: '2099-12-31',
            presentation: 'unit' as 'unit' | 'box',
            boxUnitsPerBox: 1,
        });
    };

    const handleBackClick = () => {
        if (selectedColor) setSelectedColor(null);
        else if (selectedSize) setSelectedSize(null);
        else if (currentCategoryId) {
            const current = getCategory(currentCategoryId);
            setCurrentCategoryId(current?.parentId || null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalProductId = selectedProduct?.id === 'NEW' ? undefined : (selectedProduct?.parentProductId || selectedProduct?.id);
        let finalVariantId = selectedProduct?.variantId;
        
        // If they modified size or color of an existing product, treat it as a NEW product variation
        if (selectedProduct && selectedProduct.id !== 'NEW') {
            const sizeChanged = (selectedProduct.size || '') !== (formData.size || '');
            const colorChanged = (selectedProduct.color || '') !== (formData.color || '');
            const nameChanged = (selectedProduct.parentName || selectedProduct.name) !== formData.productName;
            if (sizeChanged || colorChanged || nameChanged) {
                finalProductId = undefined;
                finalVariantId = undefined;
            }
        }

        onAdd({
            ...formData,
            productId: finalProductId,
            variantId: finalVariantId,
            isFractional: Boolean(selectedProduct?.isFractional),
            bulkUnit: selectedProduct?.bulkUnit || 'qtl',
            baseUnit: selectedProduct?.baseUnit || 'lb',
        });
        resetAndClose();
    };

    const resetAndClose = () => {
        setSelectedProduct(null);
        setSearchTerm('');
        setCurrentCategoryId(null);
        setSelectedSize(null);
        setSelectedColor(null);
        setFormData({
            productName: '',
            barcode: '',
            category: '',
            size: '',
            color: '',
            brand: '',
            costPriceNIO: 0,
            priceNIO: 0,
            price2: 0,
            price3: 0,
            price4: 0,
            quantity: 1,
            batch: '',
            expiryDate: '2099-12-31',
            minStock: 1,
            presentation: 'unit' as 'unit' | 'box',
            boxUnitsPerBox: 1,
            isFractional: false,
            bulkUnit: 'qtl',
            baseUnit: 'lb',
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={resetAndClose}>
            <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="p-6 pb-2 space-y-4">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>Agregar Producto a Factura</DialogTitle>
                                <DialogDescription>
                                    Busque un producto existente o registre uno nuevo para esta compra.
                                </DialogDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setViewMode(viewMode === 'search' ? 'folders' : 'search')}
                                className={cn("gap-2 font-bold", viewMode === 'folders' ? "bg-orange-100 border-orange-500 text-orange-700 hover:bg-orange-200" : "bg-primary/10 border-primary text-primary")}
                            >
                                {viewMode === 'search' ? (
                                    <><LayoutGrid className="h-4 w-4" /> NAVEGAR POR CARPETAS</>
                                ) : (
                                    <><Search className="h-4 w-4" /> VOLVER A LISTADO NORMAL</>
                                )}
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Search Bar - Always Visible */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, marca o código de barras..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (e.target.value && viewMode !== 'search') setViewMode('search');
                            }}
                            className="pl-10 h-14 text-lg font-medium border-2 focus-visible:ring-primary shadow-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {!selectedProduct ? (
                    <div className="flex-1 overflow-hidden flex flex-col p-6 pt-0 space-y-4">
                        {viewMode === 'folders' && (
                            <div className="flex items-center gap-2 bg-primary p-2 rounded-t-md text-white overflow-hidden shadow-md">
                                <div className="flex items-center text-sm whitespace-nowrap overflow-x-auto no-scrollbar flex-1">
                                    {breadcrumbs.map((crumb, index) => (
                                        <div key={crumb.id || index} className="flex items-center">
                                            {index > 0 && <ChevronRight className="w-4 h-4 mx-1 opacity-50" />}
                                            <span
                                                className={cn("cursor-pointer hover:underline", index === breadcrumbs.length - 1 && "font-bold")}
                                                onClick={() => {
                                                    if (crumb.id === null) setCurrentCategoryId(null);
                                                    else if (crumb.type === 'cat') setCurrentCategoryId(crumb.id);
                                                    else if (crumb.type === 'size') setSelectedColor(null);
                                                }}
                                            >
                                                {crumb.id === null ? <Home className="w-4 h-4" /> : crumb.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {(currentCategoryId || selectedSize || selectedColor) && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20" onClick={handleBackClick}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}

                        <ScrollArea className="flex-1 border rounded-lg bg-gray-50/50 p-4">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="h-full">
                                    {viewMode === 'search' ? (
                                        filteredProducts.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {filteredProducts.map(product => (
                                                    <div 
                                                        key={product.id}
                                                        onClick={() => handleSelectProduct(product)}
                                                        className="flex items-center justify-between p-3 border bg-white rounded-lg hover:bg-primary/5 cursor-pointer transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                                                <Package className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold uppercase text-sm">{product.name}</p>
                                                                <div className="flex gap-2 text-[10px] text-muted-foreground font-medium">
                                                                    {product.barcode && <Badge variant="outline" className="text-[9px] h-4">{product.barcode}</Badge>}
                                                                    {product.size && <span>Talla: {product.size}</span>}
                                                                    {product.color && <span>Color: {product.color}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                                                            Seleccionar
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                                <p className="text-muted-foreground">No se encontró el producto.</p>
                                                <Button onClick={handleAddNew} variant="secondary">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Registrar como Producto Nuevo
                                                </Button>
                                            </div>
                                        )
                                    ) : (
                                        /* Folder View */
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {folderViewContent?.type === 'navigation' && (
                                                <>
                                                    {folderViewContent.categories.map(cat => (
                                                        <div
                                                            key={cat.id}
                                                            onClick={() => setCurrentCategoryId(cat.id)}
                                                            className="aspect-square bg-[#673AB7] hover:bg-[#5E35B1] text-white p-4 cursor-pointer rounded-sm flex flex-col items-center justify-center text-center transition-colors group"
                                                        >
                                                            <Folder className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                                                            <span className="font-bold text-xs uppercase leading-tight line-clamp-2">{cat.name}</span>
                                                        </div>
                                                    ))}
                                                    {folderViewContent.products.map(product => (
                                                        <div
                                                            key={product.id}
                                                            onClick={() => handleSelectProduct(product)}
                                                            className="aspect-square bg-[#03A9F4] hover:bg-[#039BE5] text-white p-2 cursor-pointer rounded-sm flex flex-col justify-between transition-colors group"
                                                        >
                                                            <div className="text-[10px] font-bold leading-tight line-clamp-3 uppercase group-hover:underline">
                                                                {product.name}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[8px] opacity-80 uppercase">{product.color} {product.size}</div>
                                                                <div className="font-black text-sm">C$ {product.priceNIO}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {folderViewContent.categories.length === 0 && folderViewContent.products.length === 0 && (
                                                        <div className="col-span-full py-10 text-center text-gray-400">Carpeta Vacía</div>
                                                    )}
                                                </>
                                            )}
                                            {folderViewContent?.type === 'folders' && (
                                                <>
                                                    {folderViewContent.values.map(val => (
                                                        <div
                                                            key={val}
                                                            onClick={() => folderViewContent.attrType === 'size' ? setSelectedSize(val) : setSelectedColor(val)}
                                                            className={cn(
                                                                "aspect-square p-4 cursor-pointer rounded-sm flex flex-col items-center justify-center text-center transition-colors group text-white",
                                                                folderViewContent.attrType === 'size' ? "bg-[#9C27B0] hover:bg-[#7B1FA2]" : "bg-[#2196F3] hover:bg-[#1976D2]"
                                                            )}
                                                        >
                                                            <FolderOpen className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                                                            <span className="font-black text-sm uppercase leading-tight">{val}</span>
                                                            <span className="text-[8px] opacity-70 mt-1 uppercase font-bold">{folderViewContent.attrType === 'size' ? 'Talla' : 'Color'}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                        
                        <div className="flex justify-center">
                            <Button onClick={handleAddNew} variant="ghost" className="text-primary font-bold">
                                <Plus className="mr-2 h-4 w-4" /> No existe? Crear Producto Nuevo
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-4">
                            <h3 className="font-black text-primary uppercase text-sm mb-1">
                                {selectedProduct.id === 'NEW' ? 'Nuevo Producto' : 'Producto Existente'}
                            </h3>
                            <p className="font-bold text-lg">{formData.productName || 'Sin Nombre'}</p>
                        </div>

                        <div className="rounded-lg border bg-slate-50/80 p-4 space-y-4">
                        <div>
                            <h4 className="text-sm font-black uppercase text-slate-700">Datos generales del producto</h4>
                            <p className="text-xs text-muted-foreground">Estos datos son del item principal; la talla, color y cantidad quedan como detalle.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre del Producto</Label>
                                <Input 
                                    value={formData.productName} 
                                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                                    required
                                    placeholder="Nombre del artículo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Código de Barras</Label>
                                <Input 
                                    value={formData.barcode} 
                                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Input 
                                    list="category-options"
                                    value={formData.category} 
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    placeholder="Seleccione o escriba..."
                                />
                                <datalist id="category-options">
                                    {Array.from(new Set(categories.map(c => c.name)))
                                        .sort((a, b) => a.localeCompare(b))
                                        .map((catName, index) => (
                                        <option key={index} value={catName} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label>Marca</Label>
                                <Input 
                                    value={formData.brand} 
                                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                    placeholder="Ej: Levis"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mínimo Stock</Label>
                                <Input 
                                    type="number"
                                    value={formData.minStock} 
                                    onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        </div>

                        {!isBoutique && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                        <div>
                            <h4 className="text-sm font-black uppercase text-primary">Variante a ingresar</h4>
                            <p className="text-xs text-muted-foreground">Esta linea agrega talla, color, costo, precio y cantidad al detalle del producto.</p>
                        </div>

                        {(selectedProduct?.hasBoxOption || selectedProduct?.isFractional || formData.boxUnitsPerBox > 1) && (
                            <div className="flex items-center gap-3 border-t pt-4 flex-wrap">
                                <Label className="font-black">Presentación:</Label>
                                <div className="flex rounded-lg overflow-hidden border border-slate-300">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, presentation: 'unit'})}
                                        className={cn(
                                            "px-4 py-2 text-sm font-bold transition-colors",
                                            formData.presentation === 'unit' ? "bg-primary text-primary-foreground" : "bg-white text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {selectedProduct?.isFractional ? (selectedProduct?.baseUnit || 'Unidad') : 'Unidad'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, presentation: 'box'})}
                                        className={cn(
                                            "px-4 py-2 text-sm font-bold transition-colors",
                                            formData.presentation === 'box' ? "bg-primary text-primary-foreground" : "bg-white text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {selectedProduct?.isFractional
                                            ? `${selectedProduct?.bulkUnit || 'qtl'} (${formData.boxUnitsPerBox} ${selectedProduct?.baseUnit || 'lb'})`
                                            : `Caja (${formData.boxUnitsPerBox} uds)`}
                                    </button>
                                </div>
                                {formData.presentation === 'box' && (
                                    <span className="text-xs font-semibold text-primary">
                                        Equivale a {formData.quantity * formData.boxUnitsPerBox} {selectedProduct?.baseUnit || 'unidades'}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label className="text-red-600 font-bold">Costo Unitario (C$)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={formData.costPriceNIO} 
                                    onChange={(e) => setFormData({...formData, costPriceNIO: Number(e.target.value)})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-green-600 font-bold">Precio 1 - Detalle (C$)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={formData.priceNIO} 
                                    onChange={(e) => setFormData({...formData, priceNIO: Number(e.target.value)})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-black">
                                    {formData.presentation === 'box' ? 'Cantidad de Cajas' : 'Cantidad a Ingresar'}
                                </Label>
                                <Input 
                                    type="number"
                                    value={formData.quantity} 
                                    onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                                    required
                                    className="bg-yellow-50 border-yellow-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Precio 2 (C$)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={formData.price2} 
                                    onChange={(e) => setFormData({...formData, price2: Number(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Precio 3 (C$)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={formData.price3} 
                                    onChange={(e) => setFormData({...formData, price3: Number(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Precio 4 (C$)</Label>
                                <Input 
                                    type="number"
                                    step="0.01"
                                    value={formData.price4} 
                                    onChange={(e) => setFormData({...formData, price4: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        </div>
                        )}

                        {isBoutique && (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                            <div>
                                <h4 className="text-sm font-black uppercase text-primary">Variante a ingresar</h4>
                                <p className="text-xs text-muted-foreground">Selecciona talla, color, costo, precio y cantidad.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Talla</Label>
                                    <Input 
                                        value={formData.size} 
                                        onChange={(e) => setFormData({...formData, size: e.target.value})}
                                        placeholder="Ej: M, 32, 40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Color</Label>
                                    <Input 
                                        value={formData.color} 
                                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                                        placeholder="Ej: Azul, Negro"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-t pt-4">
                                <div className="space-y-2">
                                    <Label className="text-red-600 font-bold">Costo Unitario (C$)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.costPriceNIO} 
                                        onChange={(e) => setFormData({...formData, costPriceNIO: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-green-600 font-bold">Precio 1 - Detalle (C$)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.priceNIO} 
                                        onChange={(e) => setFormData({...formData, priceNIO: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-black">Cantidad a Ingresar</Label>
                                    <Input 
                                        type="number"
                                        value={formData.quantity} 
                                        onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                                        required
                                        className="bg-yellow-50 border-yellow-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio 2 (C$)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.price2} 
                                        onChange={(e) => setFormData({...formData, price2: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio 3 (C$)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.price3} 
                                        onChange={(e) => setFormData({...formData, price3: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio 4 (C$)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        value={formData.price4} 
                                        onChange={(e) => setFormData({...formData, price4: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            </div>
                        )}

                        <div className="rounded-lg border bg-slate-50/80 p-4 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Lote / Referencia <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                                <Input 
                                    value={formData.batch} 
                                    onChange={(e) => setFormData({...formData, batch: e.target.value})}
                                    placeholder="Vacío = sumar al stock general"
                                />
                            </div>
                            {!isBoutique && (
                            <div className="space-y-2">
                                <Label>Fecha de Vencimiento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                                <Input 
                                    type="date"
                                    value={formData.expiryDate} 
                                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                />
                            </div>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setSelectedProduct(null)}>
                                Volver a Buscar
                            </Button>
                            <Button type="submit">
                                Agregar a la Factura
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
