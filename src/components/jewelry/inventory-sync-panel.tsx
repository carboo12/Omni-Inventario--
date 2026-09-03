"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { analyzeStoreCsv, applyStoreSyncToLocalInventory } from "@/lib/actions/csv-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    UploadCloud,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Gem,
    Hash,
    ArrowDownToLine,
} from "lucide-react";

interface SoldPiece {
    id: string;
    code?: string | null;
    name: string;
    karat: number;
    weight: number;
    calculatedPrice: number;
    location?: string;
}

export function InventorySyncPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [soldPieces, setSoldPieces] = useState<SoldPiece[]>([]);
    const [analyzed, setAnalyzed] = useState(false);
    const [previewMessage, setPreviewMessage] = useState("");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        setSoldPieces([]);
        setAnalyzed(false);

        try {
            const text = await file.text();
            const result = await analyzeStoreCsv(text);

            if (!result.success) {
                toast({
                    title: "Error al analizar el CSV",
                    description: result.error,
                    variant: "destructive",
                });
                return;
            }

            setSoldPieces(result.soldAtStore ?? []);
            setPreviewMessage(result.message ?? "");
            setAnalyzed(true);

            if ((result.soldAtStore ?? []).length === 0) {
                toast({
                    title: "Inventario al día",
                    description: "No se encontraron joyas vendidas en la tienda que estén pendientes de actualizar en casa.",
                });
            } else {
                toast({
                    title: "Análisis completado",
                    description: `${result.soldAtStore?.length} piezas vendidas en la tienda detectadas. Revísalas y confirma la actualización.`,
                });
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "No se pudo leer el archivo CSV.",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleApplySync = async () => {
        if (soldPieces.length === 0) return;
        if (!user?.id) {
            toast({ title: "Error", description: "Usuario no identificado.", variant: "destructive" });
            return;
        }

        setIsApplying(true);
        try {
            const ids = soldPieces.map(p => p.id);
            const result = await applyStoreSyncToLocalInventory(ids, user.id);

            if (result.success) {
                toast({
                    title: "Inventario Actualizado",
                    description: result.message,
                });
                setSoldPieces([]);
                setAnalyzed(false);
            } else {
                toast({
                    title: "Error al actualizar",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (err) {
            toast({ title: "Error inesperado", description: "Fallo al aplicar la sincronización.", variant: "destructive" });
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header card with upload */}
            <Card className="border-t-4 border-t-orange-500">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                        <ArrowDownToLine className="w-5 h-5" />
                        Actualizar Inventario Local con el Inventario del Local
                    </CardTitle>
                    <CardDescription>
                        Importa el CSV exportado desde la <strong>tienda (Inventario B)</strong>. El sistema
                        detectará qué joyas ya fueron vendidas allá y te mostrará una vista previa en rojo.
                        Luego confirma para actualizar el inventario en casa.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isAnalyzing}
                        />
                        <Button
                            variant="outline"
                            className="border-orange-400 text-orange-700 hover:bg-orange-50 font-semibold"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UploadCloud className="w-4 h-4 mr-2" />
                            )}
                            {isAnalyzing ? "Analizando CSV..." : "Importar CSV de la Tienda"}
                        </Button>

                        {analyzed && soldPieces.length > 0 && (
                            <Button
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                                onClick={handleApplySync}
                                disabled={isApplying}
                            >
                                {isApplying ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                {isApplying
                                    ? "Actualizando..."
                                    : `Confirmar: Marcar ${soldPieces.length} pieza(s) como Vendidas`}
                            </Button>
                        )}

                        {analyzed && soldPieces.length === 0 && (
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-md text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Inventario al día — Ninguna pieza nueva por actualizar
                            </div>
                        )}
                    </div>

                    {analyzed && previewMessage && (
                        <p className="text-sm text-muted-foreground">{previewMessage}</p>
                    )}
                </CardContent>
            </Card>

            {/* Preview of sold pieces */}
            {analyzed && soldPieces.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <h3 className="font-semibold text-red-700 text-sm">
                            Piezas vendidas en la tienda — pendientes de actualizar en casa:
                        </h3>
                        <Badge variant="destructive" className="ml-auto">
                            {soldPieces.length} piezas
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {soldPieces.map((piece) => {
                            const displayCode = piece.code ?? "—";
                            return (
                                <div
                                    key={piece.id}
                                    className="relative border-2 border-red-400 bg-red-50 rounded-xl p-4 flex items-start gap-3 shadow-sm"
                                >
                                    {/* Red sold overlay indicator */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-red-600 font-bold flex items-center gap-0.5">
                                                <Hash className="w-3 h-3" />{displayCode}
                                            </span>
                                            <Badge className="text-[10px] px-1.5 py-0 bg-red-600 text-white border-none leading-tight">
                                                VENDIDA EN TIENDA
                                            </Badge>
                                        </div>
                                        <p className="font-semibold text-sm text-red-900 truncate">{piece.name}</p>
                                        <div className="flex gap-3 mt-1 text-xs text-red-700">
                                            <span className="flex items-center gap-0.5">
                                                <Gem className="w-3 h-3" /> {piece.karat}K
                                            </span>
                                            <span>{piece.weight.toFixed(2)}g</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            Al presionar <strong>"Confirmar"</strong>, estas piezas serán marcadas como{" "}
                            <strong>VENDIDAS</strong> en el inventario de casa. Esta acción libera su número para
                            futuras entradas y no puede revertirse fácilmente.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
