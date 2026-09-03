"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2, X, Hammer, Scale, Gem, Hash, DollarSign, Percent } from "lucide-react";
import Image from '@/components/ui/image';
import { useToast } from "@/hooks/use-toast";
import { updateJewelryPiece } from "@/lib/actions/jewelry-production";
import { getJewelryMaterials } from "@/lib/actions/jewelry-materials";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/hooks/use-settings";
import { JewelryPricingEngine } from "@/lib/services/jewelry-pricing-engine";

interface EditJewelryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    piece: {
        id: string;
        code?: string | null;
        name: string;
        weight: number;
        karat: number;
        laborCost: number;
        marginPercent: number;
        calculatedPrice: number;
        profitAmount: number;
        marketPriceUsed: number;
        photoUrl?: string | null;
        materialId?: string | null;
        status: string;
    } | null;
}

export function EditJewelryDialog({ open, onOpenChange, piece }: EditJewelryDialogProps) {
    const { toast } = useToast();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [weight, setWeight] = useState("");
    const [karat, setKarat] = useState("");
    const [laborCost, setLaborCost] = useState("");
    const [marginPercent, setMarginPercent] = useState("");
    const [calculatedPrice, setCalculatedPrice] = useState("");

    const [materialId, setMaterialId] = useState<string | "none">("none");
    const [materials, setMaterials] = useState<{ id: string, name: string }[]>([]);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (piece) {
            setCode(piece.code || "");
            setName(piece.name);
            setWeight(piece.weight.toString());
            setKarat(piece.karat.toString());
            // Convert stored USD values back to NIO for display
            setLaborCost((piece.laborCost * exchangeRate).toFixed(2));
            setMarginPercent(piece.marginPercent.toString());
            setCalculatedPrice((piece.calculatedPrice * exchangeRate).toFixed(2));
            setMaterialId(piece.materialId || "none");
            setPhotoPreview(piece.photoUrl || null);
            setPhotoBase64(null); // Reset base64 until a new photo is chosen
        }

        // Fetch materials when dialog opens
        if (open) {
            getJewelryMaterials().then(res => {
                if (res.success && res.data) setMaterials(res.data);
            });
        }
    }, [piece, open, exchangeRate]);

    const handleMarginChange = (newMargin: string) => {
        setMarginPercent(newMargin);
        if (!piece) return;

        const result = JewelryPricingEngine.calculate({
            grams: parseFloat(weight) || 0,
            karat: parseInt(karat, 10) || 0,
            laborNIO: parseFloat(laborCost) || 0,
            marketPriceUSD: piece.marketPriceUsed || 0,
            exchangeRate,
            marginPercent: parseFloat(newMargin) || 0
        });
        setCalculatedPrice(result.salePriceNIO.toFixed(2));
    };

    const handlePriceChange = (newPrice: string) => {
        setCalculatedPrice(newPrice);
        if (!piece) return;

        const newMargin = JewelryPricingEngine.calculateMarginFromPrice(
            parseFloat(newPrice) || 0,
            parseFloat(weight) || 0,
            parseInt(karat, 10) || 0,
            parseFloat(laborCost) || 0,
            piece.marketPriceUsed || 0,
            exchangeRate
        );
        setMarginPercent(newMargin.toFixed(1));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: "Error", description: "La imagen es demasiado grande (máx 2MB)", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPhotoPreview(base64);
                setPhotoBase64(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setPhotoBase64(""); // Empty string to clear in DB
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!piece) return;

        setLoading(true);
        try {
            const resultPricing = JewelryPricingEngine.calculate({
                grams: parseFloat(weight) || 0,
                karat: parseInt(karat, 10) || 0,
                laborNIO: parseFloat(laborCost) || 0,
                marketPriceUSD: piece.marketPriceUsed || 0,
                exchangeRate,
                marginPercent: parseFloat(marginPercent) || 0
            });

            const result = await updateJewelryPiece(piece.id, {
                code: code.trim() || null,
                name,
                weight: parseFloat(weight) || 0,
                karat: parseInt(karat, 10) || 0,
                laborCost: resultPricing.laborCostUSD,
                marginPercent: resultPricing.marginPercent,
                calculatedPrice: resultPricing.salePriceUSD,
                profitAmount: resultPricing.profitNIO,
                materialId: materialId === "none" ? null : materialId,
                photoUrl: photoBase64 ?? undefined,
            });

            if (result.success) {
                toast({ title: "Éxito", description: "Pieza actualizada correctamente" });
                onOpenChange(false);
            } else {
                toast({ title: "Error", description: result.error || "Ocurrió un error", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Editar Pieza de Joyería</DialogTitle>
                    <DialogDescription>
                        Realice cambios en la información de la joya. Haga clic en guardar cuando haya terminado.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6">
                    <form id="edit-jewelry-form" onSubmit={handleSubmit} className="space-y-4 pb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">Código (Opcional)</Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="edit-code" className="pl-10" value={code} onChange={(e) => setCode(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nombre</Label>
                                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-weight">Peso (g)</Label>
                                <div className="relative">
                                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="edit-weight" type="number" step="0.01" className="pl-10" value={weight} onChange={(e) => {
                                        setWeight(e.target.value);
                                        // Trigger price recalculation if we have margin
                                        const margin = parseFloat(marginPercent) || 0;
                                        handleMarginChange(margin.toString());
                                    }} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-karat">Kilataje</Label>
                                <div className="relative">
                                    <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="edit-karat" type="number" className="pl-10" value={karat} onChange={(e) => {
                                        setKarat(e.target.value);
                                        const margin = parseFloat(marginPercent) || 0;
                                        handleMarginChange(margin.toString());
                                    }} required />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-labor">Precio Costo (C$)</Label>
                                <div className="relative">
                                    <Hammer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="edit-labor" type="number" step="0.01" className="pl-10" value={laborCost} onChange={(e) => {
                                        setLaborCost(e.target.value);
                                        const margin = parseFloat(marginPercent) || 0;
                                        handleMarginChange(margin.toString());
                                    }} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Costo Total (Oro + Precio Costo)</Label>
                                <div className="h-10 px-3 py-2 bg-muted rounded-md text-sm flex items-center shadow-sm">
                                    <span className="font-semibold text-gray-700">
                                        C$ {(() => {
                                            if (!piece) return "0.00";
                                            const result = JewelryPricingEngine.calculate({
                                                grams: parseFloat(weight) || 0,
                                                karat: parseInt(karat, 10) || 0,
                                                laborNIO: parseFloat(laborCost) || 0,
                                                marketPriceUSD: piece.marketPriceUsed || 0,
                                                exchangeRate,
                                                marginPercent: parseFloat(marginPercent) || 0
                                            });
                                            return result.totalCostNIO.toFixed(2);
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-margin">Margen (%)</Label>
                                <div className="relative">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="edit-margin" type="number" step="0.01" className="pl-10" value={marginPercent} onChange={(e) => handleMarginChange(e.target.value)} required />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-price">Precio Final (C$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="edit-price" type="number" step="0.01" className="pl-10 text-blue-700 font-bold" value={calculatedPrice} onChange={(e) => handlePriceChange(e.target.value)} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-material">Material / Tipo</Label>
                            <Select value={materialId} onValueChange={setMaterialId}>
                                <SelectTrigger id="edit-material">
                                    <SelectValue placeholder="Seleccionar material" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin Categoría</SelectItem>
                                    {materials.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Foto de la Pieza</Label>
                            {photoPreview ? (
                                <div className="space-y-2">
                                    <div 
                                        className="relative w-full h-40 rounded-md overflow-hidden border group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Haga clic para cambiar la imagen"
                                    >
                                        <Image src={photoPreview} alt="Vista previa" fill className="object-cover transition-opacity group-hover:opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                            <ImagePlus className="w-8 h-8 text-white" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePhoto();
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus className="w-4 h-4 mr-2" />
                                        Cambiar Foto
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors text-muted-foreground"
                                >
                                    <ImagePlus className="w-8 h-8 mb-2" />
                                    <span className="text-xs">Clic para subir foto</span>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </div>
                    </form>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t">
                    <Button type="submit" form="edit-jewelry-form" disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
