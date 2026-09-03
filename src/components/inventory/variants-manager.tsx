"use client";
import { generateUUID } from '@/lib/uuid';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, RefreshCcw } from 'lucide-react';
import { getSizes, getColors, createSize, createColor } from '@/lib/actions/variants';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export interface VariantData {
    id: string; // temp id
    sizeId: string;
    sizeName: string;
    colorId: string;
    colorName: string;
    barcode: string;
    originalCost: number;
    originalPrice: number;
    costNIO: number;
    priceNIO: number;
    stock: number;
}

interface VariantsManagerProps {
    hasVariants: boolean;
    onHasVariantsChange: (val: boolean) => void;
    variants: VariantData[];
    onChange: (variants: VariantData[]) => void;
    currency: 'NIO' | 'USD';
    exchangeRate: number;
}

export function VariantsManager({ 
    hasVariants, 
    onHasVariantsChange, 
    variants, 
    onChange,
    currency,
    exchangeRate
}: VariantsManagerProps) {
    const { toast } = useToast();
    const [sizes, setSizes] = useState<{id: string, name: string}[]>([]);
    const [colors, setColors] = useState<{id: string, name: string}[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    
    // Quick Add States
    const [newSizeName, setNewSizeName] = useState('');
    const [newColorName, setNewColorName] = useState('');

    useEffect(() => {
        if (hasVariants) {
            loadMasterData();
        }
    }, [hasVariants]);

    const loadMasterData = async () => {
        const [sizeRes, colorRes] = await Promise.all([getSizes(), getColors()]);
        if (sizeRes.success) setSizes(sizeRes.data || []);
        if (colorRes.success) setColors(colorRes.data || []);
    };

    const handleAddSize = async () => {
        if (!newSizeName.trim()) return;
        const res = await createSize({ name: newSizeName });
        if (res.success && res.data) {
            setSizes([...sizes, res.data]);
            setSelectedSizes([...selectedSizes, res.data.id]);
            setNewSizeName('');
            toast({ title: 'Talla agregada' });
        } else {
            toast({ title: res.error || 'Error', variant: 'destructive' });
        }
    };

    const handleAddColor = async () => {
        if (!newColorName.trim()) return;
        const res = await createColor({ name: newColorName });
        if (res.success && res.data) {
            setColors([...colors, res.data]);
            setSelectedColors([...selectedColors, res.data.id]);
            setNewColorName('');
            toast({ title: 'Color agregado' });
        } else {
            toast({ title: res.error || 'Error', variant: 'destructive' });
        }
    };

    const generateCombinations = () => {
        if (selectedSizes.length === 0 || selectedColors.length === 0) {
            toast({ title: 'Seleccione al menos una talla y un color para generar', variant: 'destructive' });
            return;
        }

        const newVariants: VariantData[] = [];
        
        selectedSizes.forEach(sId => {
            selectedColors.forEach(cId => {
                const sName = sizes.find(s => s.id === sId)?.name || '';
                const cName = colors.find(c => c.id === cId)?.name || '';
                
                // Check if already exists to keep its data
                const existing = variants.find(v => v.sizeId === sId && v.colorId === cId);
                
                if (existing) {
                    newVariants.push(existing);
                } else {
                    newVariants.push({
                        id: generateUUID(),
                        sizeId: sId,
                        sizeName: sName,
                        colorId: cId,
                        colorName: cName,
                        barcode: '',
                        originalCost: 0,
                        originalPrice: 0,
                        costNIO: 0,
                        priceNIO: 0,
                        stock: 0
                    });
                }
            });
        });
        
        onChange(newVariants);
        toast({ title: 'Combinaciones generadas exitosamente' });
    };

    const addEmptyRow = () => {
        onChange([...variants, {
            id: generateUUID(),
            sizeId: '',
            sizeName: '',
            colorId: '',
            colorName: '',
            barcode: '',
            originalCost: 0,
            originalPrice: 0,
            costNIO: 0,
            priceNIO: 0,
            stock: 0
        }]);
    };

    const updateVariant = (id: string, field: keyof VariantData, value: any) => {
        const updated = variants.map(v => {
            if (v.id === id) {
                const newData = { ...v, [field]: value };
                
                // Auto-calculate NIO if USD is selected
                if (currency === 'USD') {
                    if (field === 'originalCost') newData.costNIO = Number((Number(value) * exchangeRate).toFixed(2));
                    if (field === 'originalPrice') newData.priceNIO = Number((Number(value) * exchangeRate).toFixed(2));
                } else {
                    if (field === 'originalCost') newData.costNIO = Number(value);
                    if (field === 'originalPrice') newData.priceNIO = Number(value);
                }
                
                // Update names if sizeId/colorId change manually
                if (field === 'sizeId') newData.sizeName = sizes.find(s => s.id === value)?.name || '';
                if (field === 'colorId') newData.colorName = colors.find(c => c.id === value)?.name || '';
                
                return newData;
            }
            return v;
        });
        onChange(updated);
    };

    const removeVariant = (id: string) => {
        onChange(variants.filter(v => v.id !== id));
    };

    // Auto-recalculate NIO prices if currency changes at the parent level
    useEffect(() => {
        if (variants.length > 0) {
            const updated = variants.map(v => ({
                ...v,
                costNIO: currency === 'USD' ? Number((v.originalCost * exchangeRate).toFixed(2)) : v.originalCost,
                priceNIO: currency === 'USD' ? Number((v.originalPrice * exchangeRate).toFixed(2)) : v.originalPrice
            }));
            onChange(updated);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency, exchangeRate]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border">
                <div className="space-y-0.5">
                    <Label className="text-base font-bold text-primary">Producto con Múltiples Variantes</Label>
                    <p className="text-xs text-muted-foreground">Habilite esto si el producto viene en diferentes tallas y colores.</p>
                </div>
                <Switch checked={hasVariants} onCheckedChange={onHasVariantsChange} />
            </div>

            {hasVariants && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                    
                    {/* Generador Rápido */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                        <h4 className="text-sm font-semibold border-b pb-2">Generador Rápido de Combinaciones</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tallas */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-500 uppercase">1. Seleccionar Tallas</Label>
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map(s => (
                                        <Badge 
                                            key={s.id} 
                                            variant={selectedSizes.includes(s.id) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelectedSizes(prev => 
                                                    prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                                );
                                            }}
                                        >
                                            {s.name}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Input placeholder="Nueva Talla" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} className="h-8 text-sm" />
                                    <Button size="sm" onClick={handleAddSize} variant="secondary" className="h-8">Añadir</Button>
                                </div>
                            </div>

                            {/* Colores */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-500 uppercase">2. Seleccionar Colores</Label>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(c => (
                                        <Badge 
                                            key={c.id} 
                                            variant={selectedColors.includes(c.id) ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelectedColors(prev => 
                                                    prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                );
                                            }}
                                        >
                                            {c.name}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Input placeholder="Nuevo Color" value={newColorName} onChange={e => setNewColorName(e.target.value)} className="h-8 text-sm" />
                                    <Button size="sm" onClick={handleAddColor} variant="secondary" className="h-8">Añadir</Button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button onClick={generateCombinations} className="w-full bg-slate-800 hover:bg-slate-700">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Generar Cuadrícula de Variantes
                            </Button>
                        </div>
                    </div>

                    {/* Tabla de Variantes */}
                    {variants.length > 0 && (
                        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-3 text-left font-semibold text-slate-600">Talla</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Color</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Cod. Barras</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Costo ({currency === 'USD' ? '$' : 'C$'})</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Venta ({currency === 'USD' ? '$' : 'C$'})</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Stock Inicial</th>
                                            <th className="p-3 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {variants.map((v, i) => (
                                            <tr key={v.id} className="hover:bg-slate-50">
                                                <td className="p-2 w-32">
                                                    <Select value={v.sizeId} onValueChange={(val) => updateVariant(v.id, 'sizeId', val)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Talla" /></SelectTrigger>
                                                        <SelectContent>
                                                            {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="p-2 w-32">
                                                    <Select value={v.colorId} onValueChange={(val) => updateVariant(v.id, 'colorId', val)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Color" /></SelectTrigger>
                                                        <SelectContent>
                                                            {colors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="p-2 w-36">
                                                    <Input className="h-8" value={v.barcode} onChange={e => updateVariant(v.id, 'barcode', e.target.value)} placeholder="Opcional" />
                                                </td>
                                                <td className="p-2 w-28">
                                                    <Input type="number" step="0.01" className="h-8" value={v.originalCost || ''} onChange={e => updateVariant(v.id, 'originalCost', e.target.value)} />
                                                </td>
                                                <td className="p-2 w-28">
                                                    <Input type="number" step="0.01" className="h-8" value={v.originalPrice || ''} onChange={e => updateVariant(v.id, 'originalPrice', e.target.value)} />
                                                </td>
                                                <td className="p-2 w-24">
                                                    <Input type="number" className="h-8" value={v.stock || ''} onChange={e => updateVariant(v.id, 'stock', Number(e.target.value))} />
                                                </td>
                                                <td className="p-2 text-center w-12">
                                                    <Button variant="ghost" size="icon" onClick={() => removeVariant(v.id)} className="h-8 w-8 text-destructive hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 border-t bg-slate-50">
                                <Button variant="outline" size="sm" onClick={addEmptyRow} className="text-xs">
                                    <PlusCircle className="mr-2 h-3 w-3" /> Fila Manual
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
