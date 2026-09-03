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
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import type { Product, InventoryItem } from '@/lib/types';
import { Separator } from '../ui/separator';
import { getCategories, CategoryWithChildren } from '@/lib/actions/categories';
import { ImagePicker } from './image-picker';
import { useSettings } from '@/hooks/use-settings';

const formSchema = z.object({
  // Product fields
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  barcode: z.string().optional(),
  unitOfMeasure: z.enum(['unit', 'bulk', 'box', 'blister']).default('unit'),
  costPriceNIO: z.coerce.number().min(0, { message: "El precio de costo no puede ser negativo." }),
  priceNIO: z.coerce.number().min(0, { message: "El precio de venta no puede ser negativo." }),
  minStock: z.coerce.number().int().min(0, { message: "El stock mínimo no puede ser negativo." }),
  categoryId: z.string({ required_error: "Debe seleccionar una categoría." }),
  inventoryType: z.enum(["pharmacy", "general", "jewelry"], { required_error: "Debe seleccionar un tipo de inventario." }),

  // Boutique fields
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  imageUrl: z.string().optional(),

  // InventoryItem fields
  batch: z.string().optional(),
  quantity: z.coerce.number().int().min(0, { message: "La cantidad no puede ser negativa." }),
  expiryDate: z.date().optional(),
  purchaseCurrency: z.enum(['NIO', 'USD']),
  originalPrice: z.coerce.number().min(0),
  originalCost: z.coerce.number().min(0).optional(),

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

interface EditProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Product & { quantity: number; batch: string; expiryDate: string; categoryId?: string }) => Promise<void>;
  product: Product;
  inventoryItem: InventoryItem;
}

export function EditProductDialog({ isOpen, onClose, onSave, product, inventoryItem }: EditProductDialogProps) {
  const { mode } = useBusinessMode();
  const { toast } = useToast();
  const { settings } = useSettings();
  const exchangeRate = parseFloat(settings.exchangeRate || '36.5');
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const loadCats = async () => {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data as any[]); // Flat list from server
      }
    }
    loadCats();
  }, []);

  useEffect(() => {
    if (product && inventoryItem) {
      form.reset({
        name: product.name,
        barcode: product.barcode ?? undefined,
        unitOfMeasure: product.unitOfMeasure as any,
        costPriceNIO: product.costPriceNIO ?? 0,
        priceNIO: product.priceNIO,
        minStock: product.minStock ?? 0,
        categoryId: (product as any).categoryId || '',
        inventoryType: product.inventoryType as "pharmacy" | "general",
        batch: inventoryItem.batch,
        quantity: inventoryItem.quantity,
        expiryDate: (inventoryItem.expiryDate && inventoryItem.expiryDate !== 'N/A' && !isNaN(Date.parse(inventoryItem.expiryDate))) ? parseISO(inventoryItem.expiryDate) : undefined,
        brand: product.brand ?? '',
        size: product.size ?? '',
        color: product.color ?? '',
        gender: product.gender ?? '',
        imageUrl: product.imageUrl ?? '',
        purchaseCurrency: (product as any).purchaseCurrency || 'NIO',
        originalPrice: (product as any).originalPrice || product.priceNIO,
        originalCost: (product as any).originalCost ?? product.costPriceNIO ?? 0,
        price2: (product as any).price2 ?? undefined,
        price3: (product as any).price3 ?? undefined,
        price4: (product as any).price4 ?? undefined,
        bulkUnit: (product as any).bulkUnit ?? '',
        unitsPerBulk: (product as any).unitsPerBulk ?? (product as any).unitsPerBox ?? undefined,
        bulkUnit2: (product as any).bulkUnit2 ?? '',
        unitsPerBulk2: (product as any).unitsPerBulk2 ?? undefined,
        bulkUnit3: (product as any).bulkUnit3 ?? '',
        unitsPerBulk3: (product as any).unitsPerBulk3 ?? undefined,
        isFractional: (product as any).isFractional ?? false,
        trackInventory: (product as any).trackInventory ?? true,
      });
    }
    setIsSaving(false);
  }, [product, inventoryItem, form, isOpen]);

  // Autocalcule NIO Prices when USD original prices or currency change
  const currentCurrency = form.watch('purchaseCurrency');
  const originalPrice = form.watch('originalPrice');
  const originalCost = form.watch('originalCost');

  useEffect(() => {
    if (currentCurrency === 'USD') {
      form.setValue('priceNIO', Number((originalPrice * exchangeRate).toFixed(2)));
      if (originalCost) {
        form.setValue('costPriceNIO', Number((originalCost * exchangeRate).toFixed(2)));
      }
    } else {
      // If switched back to NIO, use the original values as the NIO values
      form.setValue('priceNIO', originalPrice);
      if (originalCost) {
        form.setValue('costPriceNIO', originalCost);
      }
    }
  }, [currentCurrency, originalPrice, originalCost, exchangeRate, form]);

  const handleSubmit = async (values: FormValues) => {
    if (isSaving) return;

    if (mode === 'PHARMACY') {
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
      const selectedCategory = categories.find(c => c.id === values.categoryId);
      const hasBoxOption = Boolean(values.bulkUnit && values.unitsPerBulk && values.unitsPerBulk > 1);
      const { originalCost, ...productValues } = values;
      // Si el artículo NO está sujeto a inventario, se envía 0 de stock.
      const finalQuantity = values.trackInventory ? values.quantity : 0;
      const finalMinStock = values.trackInventory ? values.minStock : 0;
      await onSave({
        ...product,
        ...productValues,
        quantity: finalQuantity,
        minStock: finalMinStock,
        bulkUnit: values.isFractional ? values.bulkUnit : undefined,
        unitsPerBulk: values.isFractional ? (values.unitsPerBulk ?? undefined) : undefined,
        bulkUnit2: values.isFractional ? values.bulkUnit2 : undefined,
        unitsPerBulk2: values.isFractional ? (values.unitsPerBulk2 ?? undefined) : undefined,
        bulkUnit3: values.isFractional ? values.bulkUnit3 : undefined,
        unitsPerBulk3: values.isFractional ? (values.unitsPerBulk3 ?? undefined) : undefined,
        unitsPerBox: values.isFractional && values.unitsPerBulk ? Math.round(values.unitsPerBulk) : undefined,
        hasBoxOption: values.isFractional ? hasBoxOption : false,
        batch: values.batch || 'N/A',
        category: selectedCategory ? selectedCategory.name : 'General',
        expiryDate: values.expiryDate ? format(values.expiryDate, 'yyyy-MM-dd') : '2099-12-31',
        price2: values.price2 ?? null,
        price3: values.price3 ?? null,
        price4: values.price4 ?? null,
      } as any);

      toast({
        title: 'Artículo de Inventario Actualizado',
        description: `Se ha actualizado ${values.name}.`,
      });
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error saving product", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isBoutique = (mode as string) === 'BOUTIQUE';

  return (
    <Dialog open={isOpen} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Editar Artículo del Inventario</DialogTitle>
          <DialogDescription>
            Modifique los detalles del producto y del lote de inventario.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[calc(80vh-150px)]">
          <div className="pr-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <h4 className='text-sm font-semibold text-primary pt-2'>Información General</h4>

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
                  name="name"
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
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Barras (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 7501001122334" {...field} disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ÚNICA lista desplegable del formulario: Categoría */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría / Departamento</FormLabel>
                      <FormControl>
                        <CategoryCombobox
                          options={categories}
                          value={field.value || null}
                          onChange={field.onChange}
                          disabled={isSaving}
                          loading={categories.length === 0}
                          placeholder="Seleccionar categoría..."
                          searchPlaceholder="Buscar categoría... (ej. ARE)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              value={field.value ?? ''}
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
                              value={field.value ?? ''}
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
                        <div>Venta: <strong>C$ {form.watch('priceNIO')}</strong></div>
                      </div>
                    </div>
                  )}

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
                {mode === 'PHARMACY' && (
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
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
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