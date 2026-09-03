"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Gem, Scale, Hash, Search, Edit2, Filter, Trash2,
    ArrowRightLeft, XCircle, CheckSquare, Square, SendHorizonal, TrendingUp, Landmark
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { EditJewelryDialog } from "./edit-jewelry-dialog";
import { getJewelryMaterials } from "@/lib/actions/jewelry-materials";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from '@/components/ui/image';
import { formatCurrency } from "@/lib/utils";
import { DeleteJewelryDialog } from "./delete-jewelry-dialog";
import { TransferJewelryDialog } from "./transfer-jewelry-dialog";
import { useAuth } from "@/hooks/use-auth";
import { transferJewelryPiece } from "@/lib/actions/jewelry-production";
import { useToast } from "@/hooks/use-toast";
import { revertJewelrySale } from "@/lib/actions/jewelry";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface JewelryPiece {
    id: string;
    code?: string | null;
    name: string;
    weight: number;
    karat: number;
    laborCost: number;
    marginPercent: number;
    calculatedPrice: number;
    profitAmount?: number;
    marketPriceUsed: number;
    status: string;
    createdAt: Date;
    photoUrl?: string | null;
    materialId?: string | null;
    location?: string;
}

export function JewelryInventoryList({ pieces }: { pieces: JewelryPiece[] }) {
    const { settings } = useSettings();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [materialFilter, setMaterialFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
    const [materials, setMaterials] = useState<{ id: string, name: string }[]>([]);

    // Single-piece actions
    const [editingPiece, setEditingPiece] = useState<JewelryPiece | null>(null);
    const [deletingPiece, setDeletingPiece] = useState<JewelryPiece | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transferringPiece, setTransferringPiece] = useState<JewelryPiece | null>(null);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

    // Multi-select state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkTransferring, setIsBulkTransferring] = useState(false);

    // Revert sale pieces
    const [revertingPiece, setRevertingPiece] = useState<JewelryPiece | null>(null);
    const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
    const [masterCode, setMasterCode] = useState("");
    const [isReverting, setIsReverting] = useState(false);

    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");
    const canManage = user?.role === "admin" || user?.role === "master-admin";
    const isHome = settings.jewelryLocationMode === "HOME";

    const soldCount = pieces.filter(p => p.status === "SOLD").length;
    const availableCount = pieces.filter(p => p.status === "AVAILABLE").length;

    useEffect(() => {
        getJewelryMaterials().then(res => {
            if (res.success && res.data) setMaterials(res.data);
        });
    }, []);

    const filtered = pieces.filter((p) => {
        const term = searchTerm.toLowerCase();
        const code = (p.code ?? p.id.slice(-8)).toLowerCase();
        const matchesTerm = (
            p.name.toLowerCase().includes(term) ||
            code.includes(term) ||
            p.karat.toString().includes(term)
        );
        const matchesMaterial = materialFilter === "all" || p.materialId === materialFilter;
        
        // --- Location Restriction ---
        const userLocation = (user as any)?.assignedLocation;
        const canSeeAll = user?.role === "admin" || user?.role === "master-admin" || !userLocation || userLocation === "ALL";
        
        const matchesUserLocation = canSeeAll ? true : p.location === userLocation;
        const matchesLocation = locationFilter === "all" ? matchesUserLocation : (p.location === locationFilter && matchesUserLocation);
        
        const matchesStatus =
            statusFilter === "all" ? true
            : statusFilter === "available" ? p.status === "AVAILABLE"
            : p.status === "SOLD";
        return matchesTerm && matchesMaterial && matchesLocation && matchesStatus;
    });

    // --- Handlers ---
    const handleEdit = (piece: JewelryPiece) => { setEditingPiece(piece); setIsEditDialogOpen(true); };
    const handleDelete = (piece: JewelryPiece) => { setDeletingPiece(piece); setIsDeleteDialogOpen(true); };
    const handleTransfer = (piece: JewelryPiece) => { setTransferringPiece(piece); setIsTransferDialogOpen(true); };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const eligibleIds = filtered.filter(p => p.status === "AVAILABLE" && p.location !== "B").map(p => p.id);
        if (eligibleIds.every(id => selectedIds.has(id))) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(eligibleIds));
        }
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkTransferToB = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkTransferring(true);
        let successCount = 0;
        let errorCount = 0;

        for (const id of Array.from(selectedIds)) {
            const result = await transferJewelryPiece(id, "B");
            if (result.success) successCount++;
            else errorCount++;
        }

        setIsBulkTransferring(false);

        if (successCount > 0) {
            toast({
                title: "✅ Transferencia completada",
                description: `${successCount} piezas enviadas a la Tienda B.${errorCount > 0 ? ` ${errorCount} fallaron.` : ""}`,
            });
        } else {
            toast({ title: "Error", description: "No se pudo transferir ninguna pieza.", variant: "destructive" });
        }

        exitSelectionMode();
    };

    const handleRevertSale = async () => {
        if (!revertingPiece || !masterCode) return;
        setIsReverting(true);

        const result = await revertJewelrySale(revertingPiece.id, masterCode, user?.id || "");
        
        if (result.success) {
            toast({
                title: "✅ Venta revertida",
                description: "La pieza ahora está disponible nuevamente.",
            });
            setIsRevertDialogOpen(false);
            setMasterCode("");
            // Normalmenter revalidaríamos, pero con server actions + nextjs 15
            // el router.refresh() suele ser necesario o el cache se ocupará
            window.location.reload(); 
        } else {
            toast({
                title: "Error",
                description: result.error || "No se pudo revertir la venta.",
                variant: "destructive",
            });
        }
        
        setIsReverting(false);
    };

    const eligibleForSelection = filtered.filter(p => p.status === "AVAILABLE" && p.location !== "B");

    return (
        <div className="space-y-4">

            {/* ── Bulk action bar ── */}
            {selectionMode && (
                <div className="sticky top-16 z-20 flex items-center gap-3 bg-[#673AB7] text-white px-4 py-3 rounded-xl shadow-lg">
                    <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80">
                        {eligibleForSelection.every(p => selectedIds.has(p.id)) && eligibleForSelection.length > 0
                            ? <CheckSquare className="w-4 h-4" />
                            : <Square className="w-4 h-4" />
                        }
                        Seleccionar todas
                    </button>
                    <span className="text-white/60">|</span>
                    <span className="text-sm font-semibold">{selectedIds.size} seleccionadas</span>
                    <div className="flex-1" />
                    <Button
                        size="sm"
                        disabled={selectedIds.size === 0 || isBulkTransferring}
                        onClick={handleBulkTransferToB}
                        className="bg-white text-[#673AB7] hover:bg-white/90 font-bold gap-1.5"
                    >
                        <SendHorizonal className="w-4 h-4" />
                        {isBulkTransferring ? "Enviando..." : `Enviar ${selectedIds.size > 0 ? selectedIds.size : ""} a Tienda B`}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={exitSelectionMode} className="text-white/80 hover:text-white hover:bg-white/10">
                        Cancelar
                    </Button>
                </div>
            )}

            {/* ── Filters row ── */}
            <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por nombre, código o kilataje..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="w-full md:w-48">
                        <Select value={materialFilter} onValueChange={setMaterialFilter}>
                            <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Categoría" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las categorías</SelectItem>
                                {materials.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isHome && (
                        <div className="w-full md:w-48">
                            <Select value={locationFilter} onValueChange={setLocationFilter}>
                                <SelectTrigger className="w-full">
                                    <div className="flex items-center gap-2">
                                        <Landmark className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Ubicación" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                                    <SelectItem value="A">Almacén A (Casa)</SelectItem>
                                    <SelectItem value="B">Tienda B</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Status tabs — shown only when there are sold pieces */}
                {soldCount > 0 && (
                    <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        {(["all", "available", "sold"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                                    statusFilter === tab
                                        ? tab === "all" ? "bg-white shadow text-gray-900"
                                          : tab === "available" ? "bg-green-100 shadow text-green-800"
                                          : "bg-red-100 shadow text-red-800"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {tab === "all" ? `Todas (${pieces.length})` : tab === "available" ? `Disponibles (${availableCount})` : `Vendidas (${soldCount})`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Multi-select toggle — only in HOME as admin */}
                {canManage && isHome && !selectionMode && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-[#673AB7] text-[#673AB7] hover:bg-purple-50 gap-1.5 whitespace-nowrap"
                        onClick={() => setSelectionMode(true)}
                    >
                        <CheckSquare className="w-4 h-4" />
                        Selección múltiple
                    </Button>
                )}
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 border-dashed border-2 border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                        <Gem className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-xl font-medium">
                            {searchTerm ? "No se encontraron piezas" : "No hay piezas en inventario"}
                        </p>
                        <p className="text-sm mt-1">
                            {searchTerm ? "Intente con otro término." : "Vaya a Producción para crear nuevas joyas."}
                        </p>
                    </div>
                ) : (
                    filtered.map((piece) => {
                        const displayCode = piece.code ?? piece.id.slice(-8).toUpperCase();
                        const isSold = piece.status === "SOLD";
                        const isSelected = selectedIds.has(piece.id);
                        const canSelect = selectionMode && !isSold && piece.location !== "B";
                        const profit = piece.profitAmount ?? 0;

                        return (
                            <div
                                key={piece.id}
                                className={`relative rounded-xl border-2 overflow-hidden transition-all cursor-default ${
                                    isSelected
                                        ? "border-[#673AB7] shadow-lg shadow-purple-200 ring-2 ring-[#673AB7]/30"
                                        : isSold
                                        ? "border-red-400 shadow-red-100 shadow-md"
                                        : canSelect
                                        ? "border-gray-200 hover:border-[#673AB7]/40 cursor-pointer"
                                        : "border-gray-200 hover:shadow-lg"
                                }`}
                                onClick={() => canSelect && toggleSelect(piece.id)}
                            >
                                {/* ── Checkbox overlay (selection mode) ── */}
                                {selectionMode && !isSold && piece.location !== "B" && (
                                    <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                        isSelected ? "bg-[#673AB7] text-white" : "bg-white/80 border-2 border-gray-300"
                                    }`}>
                                        {isSelected && <CheckSquare className="w-4 h-4" />}
                                    </div>
                                )}

                                {/* ── Photo area ── */}
                                <div className={`relative w-full h-40 ${isSold ? "bg-red-100" : "bg-gray-100"}`}>
                                    {piece.photoUrl ? (
                                        <Image
                                            src={piece.photoUrl}
                                            alt={piece.name}
                                            fill
                                            unoptimized={piece.photoUrl.startsWith("data:")}
                                            className={`object-cover ${isSold ? "opacity-60 grayscale" : ""}`}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Gem className={`w-14 h-14 ${isSold ? "text-red-300" : "text-gray-300"}`} />
                                        </div>
                                    )}

                                    {/* SOLD stamp */}
                                    {isSold && (
                                        <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 pointer-events-auto">
                                                <div className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg rotate-[-8deg]">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    VENDIDA EN TIENDA
                                                </div>
                                                {canManage && !selectionMode && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        className="h-7 text-[10px] font-bold shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRevertingPiece(piece);
                                                            setIsRevertDialogOpen(true);
                                                        }}
                                                    >
                                                        REVERTIR VENTA
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Status / Location badges */}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        {!isSold && (
                                            <Badge className="bg-[#8BC34A] text-white text-[10px] px-1.5">Disponible</Badge>
                                        )}
                                        {isHome && (
                                            <Badge variant="outline" className="bg-white/80 text-black border-none text-[10px] px-1.5">
                                                {piece.location === "B" ? "Tienda B" : "Almacén A"}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Code strip */}
                                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${isSold ? "from-red-900/70" : "from-black/70"} to-transparent px-3 py-2`}>
                                        <span className="text-white font-mono font-bold text-sm flex items-center gap-1">
                                            <Hash className="w-3 h-3" />
                                            {displayCode}
                                        </span>
                                    </div>

                                    {/* Action buttons (non-selection mode) */}
                                    {canManage && !isSold && !selectionMode && (
                                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(piece); }}
                                                className="bg-white/20 hover:bg-white/50 backdrop-blur-md text-white p-1.5 rounded-full transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(piece); }}
                                                className="bg-red-500/20 hover:bg-red-500/60 backdrop-blur-md text-white p-1.5 rounded-full transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            {isHome && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTransfer(piece); }}
                                                    className="bg-blue-500/20 hover:bg-blue-500/60 backdrop-blur-md text-white p-1.5 rounded-full transition-colors"
                                                    title="Transferir"
                                                >
                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ── Card body ── */}
                                <div className="bg-white p-3 space-y-2">
                                    <div className={`font-semibold text-sm leading-tight ${isSold ? "text-red-700" : ""}`}>
                                        {piece.name}
                                        {isSold && <p className="text-xs text-red-500 font-normal mt-0.5">Ya fue vendida en la tienda</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground uppercase flex items-center gap-0.5 text-[10px]">
                                                <Scale className="w-3 h-3" /> Peso
                                            </span>
                                            <p className={`font-bold text-sm mt-0.5 ${isSold ? "text-red-700" : ""}`}>{piece.weight.toFixed(2)}g</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground uppercase flex items-center gap-0.5 text-[10px]">
                                                <Gem className="w-3 h-3" /> Kilataje
                                            </span>
                                            <p className={`font-bold text-sm mt-0.5 ${isSold ? "text-red-700" : ""}`}>{piece.karat}K</p>
                                        </div>
                                    </div>

                                    <div className={`border-t pt-2 grid grid-cols-2 gap-2 items-end ${isSold ? "opacity-60" : ""}`}>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground uppercase">Precio Venta</span>
                                            <div className={`text-lg font-extrabold leading-tight ${isSold ? "text-red-600 line-through" : "text-[#673AB7]"}`}>
                                                {formatCurrency(piece.calculatedPrice * exchangeRate)}
                                            </div>
                                        </div>
                                        {profit > 0 && (
                                            <div className="text-right">
                                                <span className="text-[10px] text-green-600 uppercase flex items-center justify-end gap-0.5">
                                                    <TrendingUp className="w-3 h-3" /> Ganancia
                                                </span>
                                                <div className="text-sm font-bold text-green-700">
                                                    +{formatCurrency(profit)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                            <Hash className="w-2 h-2" /> {new Date(piece.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <EditJewelryDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} piece={editingPiece as any} />
            <DeleteJewelryDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} piece={deletingPiece} />
            <TransferJewelryDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} piece={transferringPiece} />

            <Dialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revertir Venta</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro que quieres marcar esta pieza como disponible? 
                            Se requiere el <strong>Código Maestro</strong> para esta acción.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="master-code">Código Maestro</Label>
                        <Input 
                            id="master-code"
                            type="password"
                            value={masterCode}
                            onChange={(e) => setMasterCode(e.target.value)}
                            placeholder="Ingrese su llave de recuperación..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRevertDialogOpen(false)}>Cancelar</Button>
                        <Button 
                            disabled={!masterCode || isReverting}
                            onClick={handleRevertSale}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isReverting ? "Procesando..." : "Confirmar y Revertir"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
