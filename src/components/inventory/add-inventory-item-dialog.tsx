"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBusinessMode } from '@/hooks/use-business-mode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Loader2, Search } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import type { Product, InventoryItem } from '@/lib/types';
import { Separator } from '../ui/separator';
import { ImagePicker } from './image-picker';
import { useSettings } from '@/hooks/use-settings';
import { getCategories } from '@/lib/actions/categories';
import { CategoryCombobox } from '@/components/ui/category-combobox';

const formSchema = z.object({
  productName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  type: z.enum(['STANDARD', 'INGREDIENT', 'RECIPE_ITEM']).default('STANDARD'),
  barcode: z.string().optional().nullable(),
  unitOfMeasure: z.enum(['unit', 'bulk', 'box', 'blister']).default('unit'),
  costPriceNIO: z.coerce.number().min(0, { message: "El precio de costo no puede ser negativo." }),
  salePriceNIO: z.coerce.number().min(0, { message: "El precio de venta no puede ser negativo." }),
  minStock: z.coerce.number().int().min(0, { message: "El stock mínimo no puede ser negativo." }),
  category: z.string().min(1, { message: "Debe seleccionar una categoría." }),
  inventoryType: z.enum(["pharmacy", "general", "jewelry"], { required_error: "Debe seleccionar un tipo de inventario." }),
  batch: z.string().optional(),
  quantity: z.coerce.number().int().min(0, { message: "La cantidad no puede ser negativa." }),
  expiryDate: z.date().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  imageUrl: z.string().optional(),
  purchaseCurrency: z.enum(['NIO', 'USD']),
  originalPrice: z.coerce.number().min(0),
  originalCost: z.coerce.number().min(0).optional(),

  // Presentación base / unidad de medida (obligatoria). Ej: Unidad, Saco,
  // Caja, Libra, Botella, Quintal. Se guarda en el campo `baseUnit` de Product.
  baseUnit: z.string().trim().min(1, { message: "Debe indicar la presentación base." }),

  // Niveles de precio adicionales (siempre disponibles)
  price2: z.coerce.number().min(0).optional(),
  price3: z.coerce.number().min(0).optional(),
  price4: z.coerce.number().min(0).optional(),

  // Presentaciones fijas (Venta Fraccionada / Al Mayor): Presentación 1 obligatoria,
  // presentaciones 2 y 3 opcionales.
  bulkUnit: z.string().optional(),                                  // Presentación 1 (ej: Caja, Ristra)
  unitsPerBulk: z.coerce.number().min(0).optional(),                // Factor / Contenido (ej: 12, 24)
  bulkUnit2: z.string().optional(),                                 // Presentación 2 (opcional)
  unitsPerBulk2: z.coerce.number().min(0).optional(),
  bulkUnit3: z.string().optional(),                                 // Presentación 3 (opcional)
  unitsPerBulk3: z.coerce.number().min(0).optional(),

  // Switches
  isFractional: z.boolean().default(false),
  trackInventory: z.boolean().default(true),

  // Especificaciones adicionales (Descripción 2 y Descripción 3, opcionales)
  hasExtraDetails: z.boolean().default(false),
  description2: z.string().optional(),
  description3: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.isFractional) {
    if (!val.bulkUnit || !val.bulkUnit.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bulkUnit'], message: 'La Presentación 1 es obligatoria en venta al mayor.' });
    }
    if (!val.unitsPerBulk || val.unitsPerBulk <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['unitsPerBulk'], message: 'Ingrese el factor de unidades de la Presentación 1.' });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

interface AddInventoryItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<InventoryItem, 'id' | 'status' | 'productId' | 'parentProductId' | 'variantId'> & {
    priceNIO: number;
    costPriceNIO: number;
    minStock: number;
    unitOfMeasure: 'unit' | 'bulk' | 'box' | 'blister';
    category: string;
    categoryId?: string | null;
    barcode?: string | null;
    inventoryType: 'pharmacy' | 'general';
    type?: 'STANDARD' | 'INGREDIENT' | 'RECIPE_ITEM';
    recipeItems?: Array<{ ingredientId: string; quantity: number; unit: string }>;
    brand?: string;
    size?: string;
    color?: string;
    gender?: string;
    purchaseCurrency: 'NIO' | 'USD';
    originalPrice: number;
    price2?: number | null;
    price3?: number | null;
    price4?: number | null;
    bulkUnit?: string;
    unitsPerBulk?: number;
    bulkUnit2?: string;
    unitsPerBulk2?: number;
    bulkUnit3?: string;
    unitsPerBulk3?: number;
    unitsPerBox?: number;
    boxPrice?: number;
    hasBoxOption?: boolean;
    isFractional?: boolean;
    trackInventory?: boolean;
    baseUnit?: string;
    hasExtraDetails?: boolean;
    description2?: string | null;
    description3?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  existingProducts: Product[];
}

export function AddInventoryItemDialog({ isOpen, onClose, onSave, existingProducts }: AddInventoryItemDialogProps) {
  const { mode } = useBusinessMode();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Determine default inventory type based on business mode
  const defaultInventoryType: 'pharmacy' | 'general' | 'jewelry' =
    (mode as string) === 'DISTRIBUIDORA' || (mode as string) === 'BOUTIQUE'
      ? 'general'
      : (mode as string) === 'JEWELRY'
        ? 'jewelry'
        : 'pharmacy';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      type: 'STANDARD',
      barcode: '',
      unitOfMeasure: 'unit',
      costPriceNIO: 0,
      salePriceNIO: 0,
      minStock: 10,
      category: '',
      inventoryType: defaultInventoryType,
      batch: '',
      quantity: 0,
      brand: '',
      size: '',
      color: '',
      gender: '',
      imageUrl: '',
      purchaseCurrency: 'NIO',
      originalPrice: 0,
      originalCost: 0,
      price2: undefined,
      price3: undefined,
      price4: undefined,
      bulkUnit: '',
      unitsPerBulk: undefined,
      bulkUnit2: '',
      unitsPerBulk2: undefined,
      bulkUnit3: '',
      unitsPerBulk3: undefined,
      baseUnit: '',
      isFractional: false,
      trackInventory: true,
      hasExtraDetails: false,
      description2: '',
      description3: '',
    },
  });
  const { settings } = useSettings();
  const exchangeRate = parseFloat(settings.exchangeRate || '36.5');
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Cargar categorías existentes (las mismas del menú "Categorías").
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setIsLoadingCategories(true);
    getCategories()
      .then((res) => {
        if (mounted && res.success) {
          setCategories((res.data || []) as any[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCategories(false);
      });
    return () => { mounted = false; };
  }, [isOpen]);

  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const filteredTemplates = React.useMemo(() => {
    if (!templateSearch) return [];
    const lowerSearch = templateSearch.toLowerCase();
    return existingProducts.filter(p =>
      p.name.toLowerCase().includes(lowerSearch) ||
      (p.barcode && p.barcode.toLowerCase().includes(lowerSearch))
    ).slice(0, 8);
  }, [templateSearch, existingProducts]);

  const handleSelectTemplate = (product: Product) => {
    form.setValue('productName', product.name);
    form.setValue('type', (product as any).type || 'STANDARD');
    form.setValue('barcode', product.barcode || '');
    const matchedCat = categories.find(c => c.name === product.category);
    form.setValue('category', (product as any).categoryId || matchedCat?.id || product.category);
    form.setValue('salePriceNIO', product.priceNIO);
    form.setValue('costPriceNIO', product.costPriceNIO || 0);
    form.setValue('originalCost', (product as any).costPriceNIO || product.costPriceNIO || 0);
    form.setValue('minStock', product.minStock || 10);
    form.setValue('inventoryType', product.inventoryType as any);
    form.setValue('brand', product.brand || '');
    form.setValue('size', product.size || '');
    form.setValue('color', product.color || '');
    form.setValue('gender', product.gender || '');
    form.setValue('imageUrl', product.imageUrl || '');
    form.setValue('purchaseCurrency', (product as any).purchaseCurrency || 'NIO');
    form.setValue('originalPrice', (product as any).originalPrice || product.priceNIO);
    form.setValue('price2', (product as any).price2 ?? undefined);
    form.setValue('price3', (product as any).price3 ?? undefined);
    form.setValue('price4', (product as any).price4 ?? undefined);
    form.setValue('bulkUnit', (product as any).bulkUnit || '');
    form.setValue('unitsPerBulk', (product as any).unitsPerBulk ?? (product as any).unitsPerBox ?? undefined);
    form.setValue('bulkUnit2', (product as any).bulkUnit2 || '');
    form.setValue('unitsPerBulk2', (product as any).unitsPerBulk2 ?? undefined);
    form.setValue('bulkUnit3', (product as any).bulkUnit3 || '');
    form.setValue('unitsPerBulk3', (product as any).unitsPerBulk3 ?? undefined);
    form.setValue('baseUnit', (product as any).baseUnit || '');
    form.setValue('isFractional', (product as any).isFractional ?? false);
    form.setValue('trackInventory', (product as any).trackInventory ?? true);
    form.setValue('hasExtraDetails', (product as any).hasExtraDetails ?? false);
    form.setValue('description2', (product as any).description2 || '');
    form.setValue('description3', (product as any).description3 || '');
    setShowTemplates(false);
    setTemplateSearch('');
    toast({ title: 'Plantilla aplicada', description: 'Datos copiados. Modifique lo que necesite.' });
  };

  // ── Módulo Opcional de Recetas (BOM) ─────────────────────────────────────
  const enableRecipes = !!settings.enableRecipes;
  const batchExpiryEnabled = !!settings.enableBatchAndExpiration;

  const [ingredientQuery, setIngredientQuery] = useState('');
  const [showIngredientResults, setShowIngredientResults] = useState(false);
  const [recipeLines, setRecipeLines] = useState<Array<{
    ingredientId: string;
    name: string;
    unitOfMeasure?: string | null;
    costPriceNIO?: number | null;
    quantity: number;
    unit: string;
  }>>([]);
  const [marginPct, setMarginPct] = useState(40);

  const ingredientResults = React.useMemo(() => {
    if (!ingredientQuery) return [];
    const lowerSearch = ingredientQuery.toLowerCase();
    return existingProducts.filter(p =>
      (p as any).type === 'INGREDIENT' &&
      (p.name.toLowerCase().includes(lowerSearch) || (p.barcode && p.barcode.toLowerCase().includes(lowerSearch)))
    ).slice(0, 8);
  }, [ingredientQuery, existingProducts]);

  const addIngredient = (p: Product) => {
    setRecipeLines((prev) => {
      const existing = prev.find(l => l.ingredientId === p.id);
      if (existing) {
        return prev.map(l => l.ingredientId === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        ingredientId: p.id,
        name: p.name,
        unitOfMeasure: p.unitOfMeasure ?? null,
        costPriceNIO: p.costPriceNIO ?? 0,
        quantity: 1,
        unit: 'unidad'
      }];
    });
    setIngredientQuery('');
    setShowIngredientResults(false);
  };

  const updateRecipeLine = (idx: number, patch: Partial<{ quantity: number; unit: string }>) => {
    setRecipeLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeRecipeLine = (idx: number) => {
    setRecipeLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const recipeTotalCost = recipeLines.reduce((sum, l) => sum + (l.quantity || 0) * (l.costPriceNIO || 0), 0);

  const suggestedPrice = marginPct >= 100 || marginPct < 0
    ? null
    : recipeTotalCost > 0
      ? recipeTotalCost / (1 - marginPct / 100)
      : null;

  const applySuggestedPrice = () => {
    if (suggestedPrice == null || suggestedPrice <= 0) return;
    form.setValue('salePriceNIO', Math.round(suggestedPrice * 100) / 100);
    toast({
      title: 'Precio sugerido aplicado',
      description: `Precio de venta establecido en C$ ${(Math.round(suggestedPrice * 100) / 100).toFixed(2)}.`,
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setIsSaving(false);
      setTemplateSearch('');
      setShowTemplates(false);
      setIngredientQuery('');
      setShowIngredientResults(false);
      setRecipeLines([]);
      setMarginPct(40);
      form.reset({
        productName: '',
        type: 'STANDARD',
        barcode: '',
        unitOfMeasure: 'unit',
        costPriceNIO: 0,
        salePriceNIO: 0,
        minStock: 10,
        category: '',
        inventoryType: defaultInventoryType,
        batch: '',
        quantity: 0,
        brand: '',
        size: '',
        color: '',
        gender: '',
        imageUrl: '',
        purchaseCurrency: 'NIO',
        originalPrice: 0,
        originalCost: 0,
        price2: undefined,
        price3: undefined,
        price4: undefined,
bulkUnit: '',
      unitsPerBulk: undefined,
      bulkUnit2: '',
      unitsPerBulk2: undefined,
      bulkUnit3: '',
      unitsPerBulk3: undefined,
      baseUnit: '',
      isFractional: false,
      trackInventory: true,
      hasExtraDetails: false,
      description2: '',
      description3: '',
      });
    }
  }, [isOpen, form, defaultInventoryType]);

  // Autocalcule NIO Prices when USD original prices or currency change
  const currentCurrency = form.watch('purchaseCurrency');
  const originalPrice = form.watch('originalPrice');
  const originalCost = form.watch('originalCost');

  useEffect(() => {
    if (currentCurrency === 'USD') {
      form.setValue('salePriceNIO', Number((originalPrice * exchangeRate).toFixed(2)));
      if (originalCost) {
        form.setValue('costPriceNIO', Number((originalCost * exchangeRate).toFixed(2)));
      }
    } else {
      // If switched back to NIO, use the original values as the NIO values
      form.setValue('salePriceNIO', originalPrice);
      if (originalCost) {
        form.setValue('costPriceNIO', originalCost);
      }
    }
  }, [currentCurrency, originalPrice, originalCost, exchangeRate, form]);

  const isBoutique = (mode as string) === 'BOUTIQUE';

  const handleSubmit = async (values: FormValues) => {
    if (isSaving) return;

    if (mode === 'PHARMACY' && batchExpiryEnabled) {
      let hasError = false;
      if (!values.batch) {
        form.setError('batch', { message: 'El lote es requerido en Farmacia.' });
        hasError = true;
      }
      if (!values.expiryDate) {
        form.setError('expiryDate', { message: 'La fecha de vencimiento es requerida en Farmacia.' });
        hasError = true;
      }
      if (hasError) return;
    }

    setIsSaving(true);
    try {
      const hasBoxOption = Boolean(values.bulkUnit && values.unitsPerBulk && values.unitsPerBulk > 1);
      // Si el artículo NO está sujeto a inventario, no se registra stock.
      const finalQuantity = values.trackInventory ? values.quantity : 0;
      const finalMinStock = values.trackInventory ? values.minStock : 0;
      const result = await onSave({
        productName: values.productName,
        type: values.type,
        recipeItems: recipeLines.filter(l => l.ingredientId && l.quantity > 0).map(l => ({
          ingredientId: l.ingredientId,
          quantity: Number(l.quantity) || 0,
          unit: l.unit.trim() || 'unidad'
        })),
        barcode: values.barcode || null,
        inventoryType: values.inventoryType,
        batch: values.batch || 'N/A',
        quantity: finalQuantity,
        expiryDate: values.expiryDate ? format(values.expiryDate, 'yyyy-MM-dd') : '2099-12-31',
        priceNIO: values.salePriceNIO, // This is the sale (menudeo) price
        costPriceNIO: values.costPriceNIO,
        minStock: finalMinStock,
        unitOfMeasure: values.unitOfMeasure,
        category: categories.find(c => c.id === values.category)?.name || values.category,
        categoryId: values.category || null,
        brand: values.brand,
        size: values.size,
        color: values.color,
        gender: values.gender,
        imageUrl: values.imageUrl,
        purchaseCurrency: values.purchaseCurrency,
        originalPrice: values.originalPrice,
        price2: values.price2 ?? null,
        price3: values.price3 ?? null,
        price4: values.price4 ?? null,
        bulkUnit: values.isFractional ? values.bulkUnit : undefined,
        unitsPerBulk: values.isFractional ? (values.unitsPerBulk ?? undefined) : undefined,
        bulkUnit2: values.isFractional ? values.bulkUnit2 : undefined,
        unitsPerBulk2: values.isFractional ? (values.unitsPerBulk2 ?? undefined) : undefined,
        bulkUnit3: values.isFractional ? values.bulkUnit3 : undefined,
        unitsPerBulk3: values.isFractional ? (values.unitsPerBulk3 ?? undefined) : undefined,
        unitsPerBox: values.isFractional && values.unitsPerBulk ? Math.round(values.unitsPerBulk) : undefined,
        hasBoxOption: values.isFractional ? hasBoxOption : false,
        isFractional: values.isFractional,
        trackInventory: values.trackInventory,
        baseUnit: values.baseUnit.trim(),
        hasExtraDetails: values.hasExtraDetails,
        description2: values.hasExtraDetails ? (values.description2?.trim() || null) : null,
        description3: values.hasExtraDetails ? (values.description3?.trim() || null) : null,
      } as any);

      if (!result?.success) {
        console.error("Error al guardar artículo desde el servidor:", result?.error);
        toast({
          title: 'Error al añadir artículo',
          variant: 'destructive',
          description: result?.error || 'Ocurrió un error inesperado.',
        });
        return;
      }

      toast({
        title: 'Artículo de Inventario Añadido',
        description: `Se ha añadido ${finalQuantity} de ${values.productName} (Lote: ${values.batch}).`,
      });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error saving item", error);
      toast({
        title: 'Error al añadir artículo',
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription>
            Complete los detalles para añadir un nuevo producto o lote al inventario.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[calc(80vh-150px)]">
          <div className="pr-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <h4 className='text-sm font-semibold text-primary pt-2'>Información General</h4>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Search className="h-4 w-4" />
                    <span>Buscar producto existente para usar como plantilla</span>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar por nombre o código..."
                      value={templateSearch}
                      onChange={(e) => {
                        setTemplateSearch(e.target.value);
                        setShowTemplates(true);
                      }}
                      onFocus={() => setShowTemplates(true)}
                      disabled={isSaving}
                    />
                    {showTemplates && filteredTemplates.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredTemplates.map(p => (
                          <div
                            key={p.id}
                            className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer flex flex-col border-b last:border-0"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectTemplate(p); }}
                          >
                            <span className="font-medium text-slate-800">{p.name}</span>
                            <span className="text-xs text-slate-500">
                              {p.brand ? `${p.brand} | ` : ''}{p.size ? `Talla: ${p.size} | ` : ''}{p.color ? `Color: ${p.color}` : ''} {p.barcode ? `| Cod: ${p.barcode}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Seleccione una plantilla para rellenar automáticamente la información, y solo cambie lo que necesite (ej. Talla, Color).</p>
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen del Producto</FormLabel>
                      <FormControl>
                        <ImagePicker
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del Producto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Acetaminofén 500mg" {...field} disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasExtraDetails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Habilitar especificaciones adicionales</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Agrega descripciones complementarias opcionales (Descripción 2 y 3).
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('hasExtraDetails') && (
                  <div className="bg-violet-50 p-4 rounded-xl border border-violet-200 space-y-4">
                    <FormField
                      control={form.control}
                      name="description2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción 2 (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Presentación o detalle adicional" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción 3 (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Presentación o detalle adicional" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Barras (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: 7501001122334"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ÚNICA lista desplegable del formulario: Categoría */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría / Departamento</FormLabel>
                      <FormControl>
                        <CategoryCombobox
                          options={categories}
                          value={field.value || null}
                          onChange={field.onChange}
                          disabled={isSaving}
                          loading={isLoadingCategories}
                          placeholder="Seleccionar categoría..."
                          searchPlaceholder="Buscar categoría... (ej. ARE)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipo de Producto: solo visible cuando la Configuración "Recetas" está habilitada */}
                {enableRecipes && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Tipo de Producto</FormLabel>
                        <FormControl>
                          <Tabs onValueChange={field.onChange} value={field.value || 'STANDARD'} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="STANDARD">Reventa (Estándar)</TabsTrigger>
                              <TabsTrigger value="INGREDIENT">Materia Prima</TabsTrigger>
                              <TabsTrigger value="RECIPE_ITEM">Platillo Preparado</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          La materia prima (INGREDIENT) se descuenta del inventario al vender platillos preparados en el POS.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isBoutique && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Bon Ami" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Género</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Hombre, Mujer, Unisex" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla / Tamaño</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: L, 38, XL" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Floreado, Rojo" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Separator className='my-6' />
                <h4 className='text-sm font-semibold text-primary'>Precios y Presentación</h4>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <FormField
                    control={form.control}
                    name="purchaseCurrency"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Moneda de Entrada</FormLabel>
                        <FormControl>
                          <Tabs onValueChange={field.onChange} value={field.value} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="NIO">Córdoba (C$)</TabsTrigger>
                              <TabsTrigger value="USD">Dólar ($)</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="originalCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio de Costo ({currentCurrency === 'USD' ? '$' : 'C$'})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              disabled={isSaving}
                              className={cn(currentCurrency === 'USD' && "border-green-500 focus-visible:ring-green-500")}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="originalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio 1 - Detalle / Público ({currentCurrency === 'USD' ? '$' : 'C$'})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              disabled={isSaving}
                              className={cn(currentCurrency === 'USD' && "border-green-500 focus-visible:ring-green-500")}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {currentCurrency === 'USD' && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center text-xs text-green-700">
                      <span className="font-medium">Conversión Automática (Tasa: {exchangeRate})</span>
                      <div className="text-right">
                        <div>Costo: <strong>C$ {form.watch('costPriceNIO')}</strong></div>
                        <div>Venta: <strong>C$ {form.watch('salePriceNIO')}</strong></div>
                      </div>
                    </div>
                  )}

                  {settings.enableWholesalePrices !== false && (
                  <>
                  {/* Niveles de Precio siempre visibles */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Niveles de Precio</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="price2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio 2 (C$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="Ej: 0.00" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio 3 (C$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="Ej: 0.00" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price4"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio 4 (C$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" placeholder="Ej: 0.00" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  </>
                  )}
                </div>

                {/* Presentación base / unidad de medida (obligatoria) */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Presentación Base (Unidad de Medida)</p>
                  <FormField
                    control={form.control}
                    name="baseUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Presentación Base *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Unidad, Saco, Caja, Libra, Botella, Quintal" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Presentaciones fijas (Venta Fraccionada / Al Mayor): Presentación 1
                    obligatoria, presentaciones 2 y 3 opcionales. Solo se muestran cuando
                    el switch "Se vende fraccionado" está activado */}
                {form.watch('isFractional') && (
                <div className="rounded-lg border border-slate-200 p-4 space-y-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Presentaciones (Al Mayor)</p>

                  {/* Presentación 1 (obligatoria) */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Presentación 1 *</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bulkUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la Presentación</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Caja, Ristra, Fardo" {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitsPerBulk"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Factor (unidades base)</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" min="1" placeholder="Ej: 12, 24" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Presentación 2 (opcional) */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Presentación 2 (opcional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bulkUnit2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la Presentación</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Media Caja, Paquete" {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitsPerBulk2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Factor (unidades base)</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" min="0" placeholder="Ej: 6" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Presentación 3 (opcional) */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Presentación 3 (opcional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bulkUnit3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la Presentación</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Ristra, Docena" {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitsPerBulk3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Factor (unidades base)</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" min="0" placeholder="Ej: 3" {...field} value={field.value ?? ''} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                )}

                <Separator className='my-6' />
                <h4 className='text-sm font-semibold text-primary'>Opciones de Venta</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trackInventory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Sujeto a Inventario</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Controla existencias y descuenta stock en cada venta.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

<FormField
                        control={form.control}
                        name="isFractional"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">Venta fraccionada / Al mayor</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Habilita las presentaciones al mayor (Caja, Ristra, etc.) y cantidades decimales.
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                </div>

                {/* Receta / Costeo: solo para platillos preparados y cuando la Configuración
                    "Recetas" esté habilitada */}
                {enableRecipes && form.watch('type') === 'RECIPE_ITEM' && (
                  <>
                    <Separator className='my-6' />
                    <h4 className='text-sm font-semibold text-primary'>Receta / Costeo</h4>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Search className="h-4 w-4" />
                        <span>Buscar materia prima</span>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Buscar insumo (INGREDIENT) por nombre o código..."
                          value={ingredientQuery}
                          onChange={(e) => {
                            setIngredientQuery(e.target.value);
                            setShowIngredientResults(true);
                          }}
                          onFocus={() => setShowIngredientResults(true)}
                          disabled={isSaving}
                        />
                        {showIngredientResults && ingredientResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {ingredientResults.map(p => (
                              <div
                                key={p.id}
                                className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer flex flex-col border-b last:border-0"
                                onMouseDown={(e) => { e.preventDefault(); addIngredient(p); }}
                              >
                                <span className="font-medium text-slate-800">{p.name}</span>
                                <span className="text-xs text-slate-500">
                                  {p.costPriceNIO ? `Costo: C$ ${p.costPriceNIO}` : 'Sin costo'} {p.barcode ? `| Cod: ${p.barcode}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {recipeLines.length > 0 ? (
                        <div className="space-y-2">
                          {recipeLines.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{line.name}</p>
                                <p className="text-xs text-slate-500">Costo: C$ {line.costPriceNIO ?? 0} / unidad</p>
                              </div>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={line.quantity}
                                className="w-20 h-8 text-sm"
                                onChange={(e) => updateRecipeLine(idx, { quantity: Number(e.target.value) || 0 })}
                                placeholder="Cant."
                              />
                              <Input
                                value={line.unit}
                                className="w-24 h-8 text-sm"
                                onChange={(e) => updateRecipeLine(idx, { unit: e.target.value })}
                                placeholder="unidad"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 whitespace-nowrap"
                                onClick={() => removeRecipeLine(idx)}
                              >
                                Quitar
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Aún no hay insumos. Busque y agregue la materia prima que consume cada platillo.
                        </p>
                      )}

                      <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">Costo Total del Platillo</span>
                        <span className="text-lg font-bold text-primary">C$ {recipeTotalCost.toFixed(2)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-500">Porcentaje de Ganancia Deseado (%)</p>
                          <Input
                            type="number"
                            min="0"
                            max="99"
                            value={marginPct}
                            onChange={(e) => setMarginPct(Number(e.target.value) || 0)}
                            placeholder="Ej: 40"
                          />
                          <p className="text-[11px] text-slate-400">Precio = Costo / (1 − Margen%)</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-500">Precio de Venta Sugerido (C$)</p>
                          <div className="flex items-center gap-2">
                            <Input
                              value={suggestedPrice ? suggestedPrice.toFixed(2) : ''}
                              readOnly
                              className="bg-slate-100"
                              placeholder="—"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="whitespace-nowrap"
                              onClick={applySuggestedPrice}
                              disabled={!suggestedPrice || suggestedPrice <= 0}
                            >
                              Aplicar Precio Sugerido
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Solo se muestran los campos de stock cuando el artículo está sujeto a inventario */}
                {form.watch('trackInventory') && (
                <>
                <Separator className='my-6' />
                <h4 className='text-sm font-semibold text-primary'>Inventario</h4>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Inicial (Cantidad Actual)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                </>
                )}

                {mode === 'PHARMACY' && batchExpiryEnabled && (
                  <>
                    <FormField
                      control={form.control}
                      name="batch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lote</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: B0123" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Vencimiento</FormLabel>
                          <Popover modal={false}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={isSaving}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Seleccione una fecha</span>
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
                                disabled={(date) =>
                                  date < new Date()
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <DialogFooter className="pt-8">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Artículo'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}