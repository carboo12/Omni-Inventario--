import React, { useState, useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, User } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import Image from '@/components/ui/image';
import { useSettings } from '@/hooks/use-settings';

export interface ProductGridHandle {
    /** Limpia el filtro, reinicia el catálogo y deja el buscador listo para el siguiente producto. */
    resetCatalog: () => void;
}

export interface ProductGridProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
    onGoBack?: () => void;
    priceLevel?: number;
    getProductPrice?: (product: Product, priceLevel: number) => number;
}

import { getCategories, CategoryWithChildren } from '@/lib/actions/categories';
import { Folder, FolderOpen, ChevronRight, Home } from 'lucide-react';

export const ProductGrid = forwardRef<ProductGridHandle, ProductGridProps>(({ products, onProductSelect, onGoBack, priceLevel = 1, getProductPrice }, ref) => {
    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    // Refs para resetear el catálogo tras agregar un ítem: enfoca el buscador y
    // devuelve el scroll al inicio.
    const searchInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);

    // Expone un manejador para que el padre (POS/Despacho) limpie el filtro y el
    // catálogo justo después de confirmar y añadir un ítem a la venta.
    useImperativeHandle(ref, () => ({
        resetCatalog() {
            setSearchTerm('');
            setCurrentCategoryId(null);
            setSelectedSize(null);
            setSelectedColor(null);
            // Devuelve el scroll del catálogo al inicio (viewport del ScrollArea).
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            viewport?.scrollTo?.({ top: 0, behavior: 'auto' });
            // Enfocar de inmediato para la siguiente búsqueda.
            window.setTimeout(() => searchInputRef.current?.focus(), 0);
        },
    }));

    // Fetch categories on mount
    React.useEffect(() => {
        const load = async () => {
            const res = await getCategories();
            if (res.success && res.data) {
                setCategories(res.data as any[]);
            }
            setIsLoadingCategories(false);
        };
        load();
    }, []);

    // Reset attributes when category changes
    useEffect(() => {
        setSelectedSize(null);
        setSelectedColor(null);
    }, [currentCategoryId]);

    // Automatic Barcode Detection (Supermarket Style)
    useEffect(() => {
        if (searchTerm.length >= 3) { // Min length to avoid accidental triggers while typing names
            // Coincidencia exacta con el barcode principal del producto.
            const exactBarcodeMatch = products.find(p => 
                p.barcode === searchTerm || 
                (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase())
            );
            
            if (exactBarcodeMatch) {
                onProductSelect(exactBarcodeMatch);
                setSearchTerm('');
            }
        }
    }, [searchTerm, products, onProductSelect]);

    // Helper to find category by ID
    const getCategory = (id: string | null) => categories.find(c => c.id === id);

    // Tipo discriminado para el contenido de la vista
    type ViewContent =
        | { type: 'search'; items: Product[] }
        | { type: 'navigation'; categories: CategoryWithChildren[]; products: Product[]; attributeFolders?: { type: 'size' | 'color', values: string[] } };

    // Filter content based on current view
    const viewContent: ViewContent = useMemo(() => {
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            return {
                type: 'search' as const,
                items: products.filter(p =>
                    p.name.toLowerCase().includes(lowerTerm) ||
                    (p.barcode && p.barcode.includes(lowerTerm)) ||
                    (p.brand && p.brand.toLowerCase().includes(lowerTerm)) ||
                    (p.size && p.size.toLowerCase().includes(lowerTerm)) ||
                    (p.color && p.color.toLowerCase().includes(lowerTerm))
                )
            };
        }

        const currentCategoryObj = getCategory(currentCategoryId);
        
        // 1. Get products in current category level
        let productsInLevel: Product[];
        if (currentCategoryObj) {
            // Comparación robusta y tolerante: la carpeta seleccionada puede llegar
            // como ID (UUID) o como NOMBRE, y cada producto puede referenciar su
            // categoría de varias formas (categoryId escalar, categoryRelation objeto
            // o legacy category como string del nombre). Normalizamos todo a
            // minúsculas y comparamos ID contra ID y NOMBRE contra NOMBRE.
            const norm = (v: any) => String(v ?? '').trim().toLowerCase();
            const targetId = norm(currentCategoryId);
            const targetName = norm(currentCategoryObj.name);

            // Recopila todas las variantes de ID/nombre de categoría de un producto.
            const productCategoryIds = (p: Product) => {
                const pAny = p as any;
                return [p.categoryId, pAny.category?.id, pAny.categoryRelation?.id]
                    .filter((v) => v != null && String(v).trim() !== '')
                    .map((v) => norm(v));
            };
            const productCategoryNames = (p: Product) => {
                const pAny = p as any;
                return [pAny.category?.name, pAny.categoryRelation?.name, pAny.category]
                    .filter((v) => v != null && String(v).trim() !== '')
                    .map((v) => norm(v));
            };

            const inTargetCat = (p: Product) => {
                // Coincide por ID de la carpeta seleccionada O por nombre de la carpeta.
                return targetId && (productCategoryIds(p).includes(targetId)
                    || productCategoryNames(p).includes(targetId))
                    || (targetName && productCategoryNames(p).includes(targetName));
            };

            // Los productos de la carpeta activa, más los de sus categorías hijas
            // (descendientes) para no perder productos anidados bajo subcarpetas.
            const descendantIds = new Set<string>();
            const collect = (parentId: string | null) => {
                categories
                    .filter(c => c.parentId === parentId)
                    .forEach(c => { collect(c.id); descendantIds.add(String(c.id)); });
            };
            collect(currentCategoryId);
            productsInLevel = products.filter(p =>
                inTargetCat(p) || (descendantIds.size > 0 && productCategoryIds(p).some((id) => descendantIds.has(id)))
            );
        } else {
            // Raíz: muestra ÚNICAMENTE las carpetas de categorías principales.
            // No se listan productos sueltos mezclados con las carpetas.
            productsInLevel = [];
        }

        // 2. Filter categories in current level
        const categoriesInLevel = categories.filter(c => c.parentId === currentCategoryId);

        // 3. Logic for Attributes (Size/Color)
        // If we are at a level with no more subcategories, or if attributes are selected
        if (currentCategoryId && categoriesInLevel.length === 0) {
            
            // Check for Size Level
            if (!selectedSize) {
                const distinctSizes = Array.from(new Set(productsInLevel.map(p => p.size || 'Sin Talla')));
                const hasRealSizes = distinctSizes.length > 1 || (distinctSizes.length === 1 && distinctSizes[0] !== 'Sin Talla');

                if (hasRealSizes) {
                    return {
                        type: 'navigation' as const,
                        categories: [],
                        products: [],
                        attributeFolders: { type: 'size', values: distinctSizes }
                    };
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
                    return {
                        type: 'navigation' as const,
                        categories: [],
                        products: [],
                        attributeFolders: { type: 'color', values: distinctColors }
                    };
                }
            }

            // Filter by selected color if applicable
            if (selectedColor) {
                productsInLevel = productsInLevel.filter(p => (p.color || 'Sin Color') === selectedColor);
            }
        }

        // 4. Fallback anti "Carpeta Vacía": sólo dentro de una carpeta de nivel hoja
        //    (sin subcategorías y sin coincidencias por mapeo categoría-id vs nombre),
        //    se fuerza la lista global de productos para que el catálogo no quede oculto.
        //    En la raíz los productos van vacíos a propósito (se muestran solo carpetas).
        if (currentCategoryId && productsInLevel.length === 0 && categoriesInLevel.length === 0) {
            // Diagnóstico: si una carpeta activa no matchea, imprime el ID/nombre objetivo
            // y la estructura real del primer producto para inspeccionar los campos de categoría.
            console.log("DEBUG POS CATEGORIA:", {
                currentCategoryId,
                targetId: String(currentCategoryId ?? '').trim().toLowerCase(),
                primerProducto: products[0]
            });
            productsInLevel = products;
        }

        return {
            type: 'navigation' as const,
            categories: categoriesInLevel,
            products: productsInLevel
        };

    }, [products, currentCategoryId, searchTerm, categories, selectedSize, selectedColor]);

    const handleCategoryClick = (categoryId: string) => {
        setCurrentCategoryId(categoryId);
    };

    const handleAttributeClick = (type: 'size' | 'color', value: string) => {
        if (type === 'size') setSelectedSize(value);
        else setSelectedColor(value);
    };

    const handleBackClick = () => {
        if (selectedColor) {
            setSelectedColor(null);
        } else if (selectedSize) {
            setSelectedSize(null);
        } else if (currentCategoryId) {
            const current = getCategory(currentCategoryId);
            setCurrentCategoryId(current?.parentId || null);
        } else if (onGoBack) {
            onGoBack();
        }
    };

    const breadcrumbs = useMemo(() => {
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


    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header Bar */}
            <div className="flex gap-2 p-2 bg-white border-b">
                <div className="bg-[#673AB7] text-white px-4 py-2 rounded-t-md font-bold flex-1 flex items-center overflow-hidden">
                    {/* Breadcrumbs */}
                    <div className="flex items-center text-sm whitespace-nowrap overflow-x-auto no-scrollbar">
                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.id || index} className="flex items-center">
                                {index > 0 && <ChevronRight className="w-4 h-4 mx-1 opacity-50" />}
                                <span
                                    className={cn("cursor-pointer hover:underline", index === breadcrumbs.length - 1 && "font-bold")}
                                    onClick={() => {
                                        if (crumb.id === null) {
                                            setCurrentCategoryId(null);
                                        } else if (crumb.type === 'cat') {
                                            setCurrentCategoryId(crumb.id);
                                        } else if (crumb.type === 'size') {
                                            setSelectedColor(null);
                                        }
                                    }}
                                >
                                    {crumb.id === null ? <Home className="w-4 h-4" /> : crumb.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-[#FF5722] text-white px-2 py-1 rounded-md flex items-center gap-2 shrink-0">
                    <span className="font-bold text-sm hidden sm:inline">Buscar:</span>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-white/70" />
                        <Input
                            ref={searchInputRef}
                            className="h-8 w-32 sm:w-40 bg-white/20 border-none text-white placeholder:text-white/70 pl-8 focus-visible:ring-1 focus-visible:ring-white"
                            placeholder="Nombre/Code"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm) {
                                    // Try to find an exact barcode match first
                                    const exactMatch = products.find(p => p.barcode === searchTerm);
                                    if (exactMatch) {
                                        onProductSelect(exactMatch);
                                        setSearchTerm('');
                                        return;
                                    }
                                    
                                    // If only one product in the search result, select it
                                    if (viewContent.type === 'search' && viewContent.items.length === 1) {
                                        onProductSelect(viewContent.items[0]);
                                        setSearchTerm('');
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 bg-white">
                {isLoadingCategories ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-400">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#673AB7] mx-auto mb-4"></div>
                            <p>Cargando categorías...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {/* Back Button (only if in category or searching) */}
                        {(currentCategoryId || searchTerm || selectedSize || selectedColor) && (
                            <div
                                onClick={() => {
                                    if (searchTerm) setSearchTerm('');
                                    else handleBackClick();
                                }}
                                className="aspect-square bg-[#FF5722] hover:bg-[#F4511E] text-white flex flex-col items-center justify-center cursor-pointer rounded-sm p-4 transition-colors"
                            >
                                <ArrowLeft className="w-16 h-16 mb-2" />
                                <span className="font-bold text-lg uppercase">VOLVER</span>
                            </div>
                        )}

                        {/* Navigation View */}
                        {viewContent.type === 'navigation' && (
                            <>
                                {viewContent.categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        onClick={() => handleCategoryClick(cat.id)}
                                        className="aspect-square bg-[#673AB7] hover:bg-[#5E35B1] text-white p-4 cursor-pointer rounded-sm flex flex-col items-center justify-center text-center transition-colors group"
                                    >
                                        <Folder className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-lg uppercase leading-tight line-clamp-2">{cat.name}</span>
                                        {cat._count && <span className="text-xs opacity-70 mt-1">{cat._count.product} prod</span>}
                                    </div>
                                ))}

                                {viewContent.attributeFolders && (
                                    <>
                                        {viewContent.attributeFolders.values.sort().map(val => (
                                            <div
                                                key={val}
                                                onClick={() => handleAttributeClick(viewContent.attributeFolders!.type, val)}
                                                className={cn(
                                                    "aspect-square p-4 cursor-pointer rounded-sm flex flex-col items-center justify-center text-center transition-colors group text-white",
                                                    viewContent.attributeFolders!.type === 'size' ? "bg-[#9C27B0] hover:bg-[#7B1FA2]" : "bg-[#2196F3] hover:bg-[#1976D2]"
                                                )}
                                            >
                                                <FolderOpen className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="font-black text-xl uppercase leading-tight">{val}</span>
                                                <span className="text-[10px] opacity-70 mt-1 uppercase font-bold">{viewContent.attributeFolders!.type === 'size' ? 'Talla' : 'Color'}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {viewContent.products.map(product => (
                                    <ProductCard key={product.id} product={product} onSelect={onProductSelect} priceLevel={priceLevel} getProductPrice={getProductPrice} />
                                ))}

                                {viewContent.categories.length === 0 && viewContent.products.length === 0 && !viewContent.attributeFolders && (
                                    <div className="col-span-full py-10 text-center text-gray-400 flex flex-col items-center">
                                        <Folder className="w-12 h-12 mb-2 opacity-50" />
                                        <p>Carpeta Vacía</p>
                                    </div>
                                )}
                            </>
                        )}


                        {/* Search View */}
                        {viewContent.type === 'search' && (
                            <>
                                {viewContent.items.map(product => (
                                    <ProductCard key={product.id} product={product} onSelect={onProductSelect} priceLevel={priceLevel} getProductPrice={getProductPrice} />
                                ))}
                                {viewContent.items.length === 0 && (
                                    <div className="col-span-full py-10 text-center text-gray-400">
                                        No se encontraron productos.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
});

// Extracted Product Card for cleaner code
const ProductCard = ({ product, onSelect, priceLevel = 1, getProductPrice }: { product: Product, onSelect: (p: Product) => void, priceLevel?: number, getProductPrice?: (product: Product, priceLevel: number) => number }) => {
    const { settings } = useSettings();
    const isUSDOrig = (product as any).purchaseCurrency === 'USD';
    const priceUSD = isUSDOrig 
        ? (product as any).originalPrice 
        : product.priceNIO / (parseFloat(settings.exchangeRate) || 36.5);

    const stock = typeof product.stock === 'number' ? product.stock : 0;
    const outOfStock = stock <= 0;
    const stockUnit = (product as any).baseUnit || (product.unitOfMeasure === 'unit' ? 'Unidad' : product.unitOfMeasure);

    return (
        <div
            onClick={() => onSelect(product)}
            className={cn(
                "aspect-square bg-white border-2 border-slate-100 hover:border-primary/50 text-slate-900 p-2 cursor-pointer rounded-xl flex flex-col justify-between transition-all relative overflow-hidden group shadow-sm hover:shadow-md",
                outOfStock && "border-[#FF5722]/60 bg-orange-50/60 hover:border-[#FF5722]"
            )}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-3xl -mr-4 -mt-4 transition-all group-hover:bg-primary/10" />

            {outOfStock && (
                <span className="absolute top-1.5 left-1.5 z-10 bg-[#FF5722] text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shadow-sm">
                    Sin Stock / Encargo
                </span>
            )}

            <div className="z-10">
                <div className="text-[11px] font-black leading-tight line-clamp-2 uppercase text-slate-800 mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-1">
                    {product.size && (
                        <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-purple-200">
                            {product.size}
                        </span>
                    )}
                    {product.color && (
                        <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-blue-200">
                            {product.color}
                        </span>
                    )}
                    {product.brand && (
                        <span className="text-[9px] text-slate-400 font-medium truncate max-w-full italic">
                            {product.brand}
                        </span>
                    )}
                </div>
            </div>

            <div className="z-10 text-right mt-auto pt-2">
                <div className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 opacity-60">
                    {product.unitOfMeasure === 'unit' ? 'Unidad' : product.unitOfMeasure}
                </div>
                <div className="font-black text-lg text-primary tracking-tight">
                    C$ {formatNumber(getProductPrice ? getProductPrice(product, priceLevel) : product.priceNIO)}
                </div>
                {settings.allowDollars && (
                    <div className="text-[11px] font-bold text-green-600 flex items-center justify-end gap-1">
                        {isUSDOrig && <span className="text-[8px] bg-green-100 px-1 rounded uppercase">Oríg.</span>}
                        $ {formatNumber(priceUSD)}
                    </div>
                )}
                <div className={cn(
                    "flex items-center justify-between mt-1 pt-1 border-t border-dashed border-slate-200 text-[9px] font-bold uppercase tracking-wide",
                    outOfStock ? "text-[#FF5722]" : "text-green-700"
                )}>
                    <span>Stock:</span>
                    <span>{formatNumber(stock)} {stockUnit}</span>
                </div>
            </div>
        </div>
    );
};
