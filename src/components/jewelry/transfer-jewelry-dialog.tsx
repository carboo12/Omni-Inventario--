"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { transferJewelryPiece } from "@/lib/actions/jewelry-production";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";

interface JewelryPiece {
    id: string;
    code?: string | null;
    name: string;
    location?: string;
}

export function TransferJewelryDialog({
    open,
    onOpenChange,
    piece,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    piece: JewelryPiece | null;
}) {
    const { toast } = useToast();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    
    // Default the target to the ONE IT IS NOT CURRENTLY IN
    // Assuming piece.location defaults to "A" if missing
    const currentLocation = piece?.location || "A";
    const initialTarget = currentLocation === "A" ? "B" : "A";
    const [targetLocation, setTargetLocation] = useState<"A" | "B">(initialTarget);

    // Update target if piece changes
    React.useEffect(() => {
        if (piece) {
            setTargetLocation((piece.location || "A") === "A" ? "B" : "A");
        }
    }, [piece]);

    if (!piece) return null;

    const handleTransfer = async () => {
        setLoading(true);
        const result = await transferJewelryPiece(piece.id, targetLocation);
        setLoading(false);

        if (result.success) {
            toast({ title: "Transferencia Exitosa", description: `Pieza movida al inventario ${targetLocation}.` });
            onOpenChange(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                        Transferir Joya
                    </DialogTitle>
                    <DialogDescription>
                        Mueva la pieza <strong>{piece.name}</strong> a otra ubicación.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Ubicación Actual</Label>
                        <div className="p-2 bg-gray-100 rounded text-sm text-gray-500">
                            {currentLocation === "A" ? "Almacén Principal (A)" : "Tienda Secundaria (B)"}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Mover a</Label>
                        <Select value={targetLocation} onValueChange={(v: "A" | "B") => setTargetLocation(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione almacén destino" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A" disabled={currentLocation === "A"}>Almacén Principal (A)</SelectItem>
                                <SelectItem value="B" disabled={currentLocation === "B"}>Tienda Secundaria (B)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleTransfer} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                        <ArrowRightLeft className="w-4 h-4 mr-2" />}
                        Confirmar Traslado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
