"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { createJewelryPiece, addJewelryToInventory } from "@/lib/actions/jewelry-production";
import { getLatestGoldPrice } from "@/lib/actions/gold-purchase";
import { Hammer, Loader2, Scale, PackagePlus, ImagePlus, X, Hash, Gem } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { getJewelryMaterials } from "@/lib/actions/jewelry-materials";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from '@/components/ui/image';
import { JewelryPricingEngine } from "@/lib/services/jewelry-pricing-engine";
import { formatNumber } from "@/lib/utils";

export type GoldStock = {
    id: string;
    karat: number;
    gramsAvailable: number;
    createdAt: Date;
    updatedAt: Date;
};

export type Mode = "production" | "direct";

export function JewelryProductionForm({ initialStock }: { initialStock: GoldStock[] }) {
    const { user } = useAuth();
    const { settings } = useSettings();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [marketPrice, setMarketPrice] = useState(0);
    const [mode, setMode] = useState<Mode>("production");
    const [quantity, setQuantity] = useState<string>("1");
    const [directPrice, setDirectPrice] = useState<string>("");
    const [materialId, setMaterialId] = useState<string | "none">("none");
    const [materials, setMaterials] = useState<{ id: string, name: string }[]>([]);
    const [goldStock, setGoldStock] = useState<GoldStock[]>(initialStock);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getJewelryMaterials().then(res => {
            if (res.success && res.data) {
                setMaterials(res.data);
                const plata = res.data.find(m => m.name.toLowerCase() === 'plata');
                if (plata) {
                    setMaterialId(plata.id);
                }
            }
        });
    }, []);

    // Shared fields
    const [name, setName] = useState("");
    const [gramsUsed, setGramsUsed] = useState<string>("");
    const [karat, setKarat] = useState<string>("925");
    const [laborCost, setLaborCost] = useState<string>("");
    const [marginPercent, setMarginPercent] = useState<string>("106.9");
    const [customSalePrice, setCustomSalePrice] = useState<string>("");
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [locationTarget, setLocationTarget] = useState<"A" | "B">("A");

    useEffect(() => {
        if (settings.jewelryLocationMode === "STORE_B") {
            setLocationTarget("B");
        } else {
            setLocationTarget("A");
        }
    }, [settings.jewelryLocationMode]);

    const marginPercentRef = useRef(marginPercent);
    useEffect(() => {
        marginPercentRef.current = marginPercent;
    }, [marginPercent]);

    useEffect(() => {
        getLatestGoldPrice().then((res) => {
            if (res.success) setMarketPrice(res.price);
        });
    }, []);

    const selectedStock = initialStock.find((s) => s.karat.toString() === karat);

    const numGrams = parseFloat(gramsUsed) || 0;
    const numLabor = parseFloat(laborCost) || 0;
    const numMargin = parseFloat(marginPercent) || 0;
    const numQuantity = parseInt(quantity, 10) || 1;

    const pricingResult = useMemo(() => {
        return JewelryPricingEngine.calculate({
            grams: numGrams,
            karat: parseInt(karat, 10) || 0,
            laborNIO: mode === "production" ? numLabor : 0,
            marketPriceUSD: marketPrice,
            exchangeRate: parseFloat(settings.exchangeRate || "36.5"),
            marginPercent: numMargin,
            fixedTotalCostNIO: mode === "direct" ? numLabor : undefined
        });
    }, [numGrams, karat, numLabor, marketPrice, settings.exchangeRate, numMargin, mode]);

    // Sincronización bidireccional
    const handleMarginChange = (val: string) => {
        setMarginPercent(val);
        const margin = parseFloat(val) || 0;
        const result = JewelryPricingEngine.calculate({
            grams: numGrams,
            karat: parseInt(karat, 10) || 0,
            laborNIO: mode === "production" ? numLabor : 0,
            marketPriceUSD: marketPrice,
            exchangeRate: parseFloat(settings.exchangeRate || "36.5"),
            marginPercent: margin,
            fixedTotalCostNIO: mode === "direct" ? numLabor : undefined
        });

        const priceStr = result.salePriceNIO.toFixed(2);
        if (mode === "production") {
            setCustomSalePrice(priceStr);
        } else {
            setDirectPrice(priceStr);
        }
    };

    const handlePriceChange = (val: string) => {
        const cleanVal = val.replace(/[^0-9.]/g, '');

        if (mode === "production") {
            setCustomSalePrice(cleanVal);
        } else {
            setDirectPrice(cleanVal);
        }

        const salePrice = parseFloat(cleanVal) || 0;
        const newMargin = JewelryPricingEngine.calculateMarginFromPrice(
            salePrice,
            numGrams,
            parseInt(karat, 10) || 0,
            mode === "production" ? numLabor : 0,
            marketPrice,
            parseFloat(settings.exchangeRate || "36.5"),
            mode === "direct" ? numLabor : undefined
        );
        setMarginPercent(newMargin.toFixed(1));
    };

    // Auto-actualizar precio cuando cambia la mano de obra, modo o pesos
    useEffect(() => {
        const result = JewelryPricingEngine.calculate({
            grams: numGrams,
            karat: parseInt(karat, 10) || 0,
            laborNIO: mode === "production" ? numLabor : 0,
            marketPriceUSD: marketPrice,
            exchangeRate: parseFloat(settings.exchangeRate || "36.5"),
            marginPercent: parseFloat(marginPercentRef.current) || 0,
            fixedTotalCostNIO: mode === "direct" ? numLabor : undefined
        });
        const priceStr = result.salePriceNIO.toFixed(2);

        if (mode === "production") {
            setCustomSalePrice(priceStr);
        } else {
            setDirectPrice(priceStr);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laborCost, mode, gramsUsed, karat, marketPrice, settings.exchangeRate]);

    const resetForm = () => {
        setName("");
        setGramsUsed("");
        setKarat("925");
        setLaborCost("");
        setMarginPercent("106.9");
        setMaterialId(materials.find(m => m.name.toLowerCase() === 'plata')?.id || "none");
        setQuantity("1");
        setPhotoPreview(null);
        setPhotoBase64(null);
        setDirectPrice("");
        setCustomSalePrice("");
        if (settings.jewelryLocationMode === "STORE_B") {
            setLocationTarget("B");
        } else {
            setLocationTarget("A");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "Imagen muy grande", description: "La foto no debe superar 2MB.", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setPhotoBase64(result);
            setPhotoPreview(result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setPhotoBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleProductionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const numGrams = parseFloat(gramsUsed) || 0;
        const numQuantity = parseInt(quantity, 10) || 1;

        if (!selectedStock || numGrams * numQuantity > selectedStock.gramsAvailable) {
            toast({
                title: "Stock insuficiente",
                description: `No hay suficiente oro ${karat}K para ${numQuantity > 1 ? `${numQuantity} piezas de ` : ""}${numGrams}g cada una.`,
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const result = await createJewelryPiece({
                userId: user.id,
                name,
                karat: Number(karat),
                gramsUsed: numGrams,
                laborCost: pricingResult.laborCostUSD,
                marginPercent: pricingResult.marginPercent,
                marketPriceUsed: marketPrice,
                calculatedPrice: pricingResult.salePriceUSD,
                profitAmount: pricingResult.profitNIO,
                materialId: materialId === "none" ? null : materialId,
                photoUrl: photoBase64 ?? undefined,
                quantity: numQuantity,
                location: locationTarget,
            });

            if (result.success) {
                const count = (result.data as any[]).length;
                toast({ title: "¡Éxito!", description: `${count} pieza(s) creada(s) y agregadas al inventario.` });
                resetForm();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDirectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const numGrams = parseFloat(gramsUsed) || 0;
        const numQuantity = parseInt(quantity, 10) || 1;

        setLoading(true);
        try {
            const result = await addJewelryToInventory({
                userId: user.id,
                name,
                karat: Number(karat),
                weight: numGrams,
                laborCost: pricingResult.laborCostUSD,
                marginPercent: pricingResult.marginPercent,
                calculatedPrice: pricingResult.salePriceUSD,
                profitAmount: pricingResult.profitNIO,
                materialId: materialId === "none" ? null : materialId,
                photoUrl: photoBase64 ?? undefined,
                quantity: numQuantity,
                location: locationTarget,
            });

            if (result.success) {
                const count = (result.data as any[]).length;
                toast({ title: "¡Éxito!", description: `${count} pieza(s) ingresada(s) al inventario.` });
                resetForm();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    type="button"
                    onClick={() => setMode("production")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${mode === "production"
                        ? "bg-[#673AB7] text-white shadow"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <Hammer className="w-4 h-4" />
                    Producción con Materiales
                </button>
                <button
                    type="button"
                    onClick={() => setMode("direct")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${mode === "direct"
                        ? "bg-[#8BC34A] text-white shadow"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <PackagePlus className="w-4 h-4" />
                    Ingreso Directo
                </button>
            </div>

            {/* ── PRODUCTION MODE ── */}
            {mode === "production" && (
                <Card className="border-t-4 border-t-[#673AB7]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Hammer className="text-[#673AB7]" />
                            Transformación de Oro a Joya
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProductionSubmit} className="space-y-5">
                            {/* SHARED FIELDS INLINED */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Pieza</Label>
                                <Input
                                    id="name"
                                    placeholder="Ej: Anillo de Compromiso 18K"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="karat">Kilataje</Label>
                                    <Input
                                        id="karat"
                                        type="number"
                                        placeholder="Ej: 14, 18, 24"
                                        value={karat}
                                        onChange={(e) => setKarat(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Peso de la Pieza (g)</Label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="weight"
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="0.00"
                                            value={gramsUsed}
                                            onChange={(e) => setGramsUsed(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="material">Material / Categoría</Label>
                                <Select key={`prod-mat-${materials.length}`} value={materialId} onValueChange={setMaterialId}>
                                    <SelectTrigger id="material">
                                        <div className="flex items-center gap-2">
                                            <Gem className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Seleccionar material" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin Categoría</SelectItem>
                                        {materials.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="labor">Precio Costo (C$)</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">C$</div>
                                        <Input
                                            id="labor"
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="0.00"
                                            value={laborCost}
                                            onChange={(e) => setLaborCost(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quantity" className="flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> Cantidad de Piezas
                                    </Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                    {numQuantity > 1 && (
                                        <p className="text-xs text-[#673AB7] font-medium">
                                            Se crearán {numQuantity} piezas idénticas
                                        </p>
                                    )}
                                </div>
                            </div>

                            {settings.jewelryLocationMode === "HOME" && (
                                <div className="space-y-2">
                                    <Label>Ubicación de Destino</Label>
                                    <Select value={locationTarget} onValueChange={(v: "A" | "B") => setLocationTarget(v)}>
                                        <SelectTrigger>
                                            <div className="flex items-center gap-2">
                                                <PackagePlus className="w-4 h-4 text-muted-foreground" />
                                                <SelectValue placeholder="Seleccione almacén" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A">Almacén Principal (A)</SelectItem>
                                            <SelectItem value="B">Tienda Secundaria (B)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* END SHARED FIELDS */}

                                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 space-y-2">
                                        <h3 className="font-bold text-sm text-[#673AB7] uppercase mb-2">Resumen de Costos</h3>
                                        <div className="flex justify-between text-sm">
                                            <span>Precio Oro Mercado (oz):</span>
                                            <span className="font-medium">${marketPrice.toLocaleString()} USD</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Costo Material (por pieza):</span>
                                            <span>${formatNumber(pricingResult.materialCostUSD)} USD</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Mano de Obra (por pieza):</span>
                                            <span>${formatNumber(pricingResult.laborCostUSD)} USD</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold pt-2 border-t">
                                            <span>Costo Total (por pieza):</span>
                                            <span>C$ {formatNumber(pricingResult.totalCostNIO)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-extrabold text-[#8BC34A] pt-1">
                                            <span>Precio Venta Sugerido:</span>
                                            <span>C$ {formatNumber(pricingResult.salePriceNIO)}</span>
                                        </div>
                                        {/* <div className={`flex justify-between text-sm font-bold p-2 rounded-md ${pricingResult.profitNIO > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                            <span>Ganancia Estimada (C$):</span>
                                            <span>C$ {formatNumber(pricingResult.profitNIO)}</span>
                                        </div> */}
                                        {parseInt(quantity, 10) > 1 && (
                                            <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
                                                <span>Oro total a consumir ({quantity} piezas):</span>
                                                <span className="font-bold text-red-500">{formatNumber(parseFloat(gramsUsed) * parseInt(quantity, 10))}g</span>
                                            </div>
                                        )}
                                    </div>

                            <Button
                                type="submit"
                                disabled={
                                    loading ||
                                    !karat ||
                                    numGrams <= 0 ||
                                    (numGrams * numQuantity) > (selectedStock?.gramsAvailable ?? 0)
                                }
                                className="w-full bg-[#673AB7] hover:bg-[#5E35B1] h-12 text-lg font-bold"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Hammer className="mr-2" />}
                                {loading ? "Procesando..." : numQuantity > 1 ? `Crear ${numQuantity} Joyas` : "Crear Joya"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* ── DIRECT ENTRY MODE ── */}
            {mode === "direct" && (
                <Card className="border-t-4 border-t-[#8BC34A]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PackagePlus className="text-[#8BC34A]" />
                            Ingreso Directo al Inventario
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Registre piezas que ya existen físicamente sin descontar materiales del stock.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleDirectSubmit} className="space-y-5">
                            {/* SHARED FIELDS INLINED */}
                            <div className="space-y-2">
                                <Label htmlFor="name-d">Nombre de la Pieza</Label>
                                <Input
                                    id="name-d"
                                    placeholder="Ej: Anillo de Compromiso 18K"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="karat-d">Kilataje</Label>
                                    <Input
                                        id="karat-d"
                                        type="number"
                                        placeholder="Ej: 14, 18, 24"
                                        value={karat}
                                        onChange={(e) => setKarat(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight-d">Peso de la Pieza (g)</Label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="weight-d"
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="0.00"
                                            value={gramsUsed}
                                            onChange={(e) => setGramsUsed(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="material-d">Material / Categoría</Label>
                                <Select key={`dir-mat-${materials.length}`} value={materialId} onValueChange={setMaterialId}>
                                    <SelectTrigger id="material-d">
                                        <div className="flex items-center gap-2">
                                            <Gem className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Seleccionar material" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin Categoría</SelectItem>
                                        {materials.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="labor-d">Precio Costo (C$)</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">C$</div>
                                        <Input
                                            id="labor-d"
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="0.00"
                                            value={laborCost}
                                            onChange={(e) => setLaborCost(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quantity-d" className="flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> Cantidad de Piezas
                                    </Label>
                                    <Input
                                        id="quantity-d"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                </div>
                            </div>

                            {settings.jewelryLocationMode === "HOME" && (
                                <div className="space-y-2">
                                    <Label>Ubicación de Destino</Label>
                                    <Select value={locationTarget} onValueChange={(v: "A" | "B") => setLocationTarget(v)}>
                                        <SelectTrigger>
                                            <div className="flex items-center gap-2">
                                                <PackagePlus className="w-4 h-4 text-muted-foreground" />
                                                <SelectValue placeholder="Seleccione almacén" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A">Almacén Principal (A)</SelectItem>
                                            <SelectItem value="B">Tienda Secundaria (B)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* END SHARED FIELDS */}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="margin-d">Margen de Ganancia (%)</Label>
                                    <Input
                                        id="margin-d"
                                        type="number"
                                        value={marginPercent}
                                        onChange={(e) => handleMarginChange(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="directPrice">Precio de Venta (C$)</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#673AB7] text-xs font-bold pointer-events-none">C$</div>
                                        <Input
                                            id="directPrice"
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-10 font-bold text-[#673AB7]"
                                            placeholder="0.00"
                                            value={directPrice}
                                            onChange={(e) => handlePriceChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PHOTO UPLOAD INLINED */}
                            <div className="space-y-2">
                                <Label>
                                    Foto de la Pieza <span className="text-muted-foreground text-xs">(opcional)</span>
                                </Label>
                                {photoPreview ? (
                                    <div className="relative w-full h-44 rounded-lg overflow-hidden border border-dashed border-[#673AB7] group">
                                        <Image src={photoPreview} alt="Foto de la joya" fill className="object-contain bg-gray-50" />
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#673AB7] hover:bg-purple-50 transition-colors"
                                    >
                                        <ImagePlus className="w-8 h-8 text-gray-400 mb-1" />
                                        <span className="text-sm text-muted-foreground">Clic para subir foto</span>
                                        <span className="text-xs text-muted-foreground">JPG, PNG, WEBP — máx. 2MB</span>
                                    </div>
                                )}
                            </div>

                            {numQuantity > 1 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-medium">
                                    💡 Se registrarán <strong>{numQuantity} piezas idénticas</strong> con código único para cada una.
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading || !name || !karat || numGrams <= 0 || (mode === "direct" && (parseFloat(directPrice.replace(/,/g, '')) || 0) <= 0)}
                                className="w-full bg-[#8BC34A] hover:bg-[#7CB342] h-12 text-lg font-bold"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <PackagePlus className="mr-2" />}
                                {loading ? "Guardando..." : numQuantity > 1 ? `Ingresar ${numQuantity} Piezas` : "Ingresar al Inventario"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
