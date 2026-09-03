"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getJewelryMaterials, createJewelryMaterial, updateJewelryMaterial, deleteJewelryMaterial } from "@/lib/actions/jewelry-materials";

export function JewelryMaterialsManager() {
    const { toast } = useToast();
    const [materials, setMaterials] = useState<{ id: string, name: string }[]>([]);
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const fetchMaterials = async () => {
        setFetching(true);
        const res = await getJewelryMaterials();
        if (res.success && res.data) {
            setMaterials(res.data);
        }
        setFetching(false);
    };

    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setLoading(true);
        const res = await createJewelryMaterial(newName.trim());
        if (res.success) {
            toast({ title: "Éxito", description: "Material añadido" });
            setNewName("");
            fetchMaterials();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setLoading(false);
    };

    const handleStartEdit = (m: { id: string, name: string }) => {
        setEditingId(m.id);
        setEditingName(m.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName("");
    };

    const handleSaveEdit = async (id: string) => {
        if (!editingName.trim()) return;
        setEditLoading(true);
        const res = await updateJewelryMaterial(id, editingName.trim());
        if (res.success) {
            toast({ title: "Éxito", description: "Material actualizado" });
            setEditingId(null);
            fetchMaterials();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setEditLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Está seguro de eliminar este material?")) return;

        const res = await deleteJewelryMaterial(id);
        if (res.success) {
            toast({ title: "Éxito", description: "Material eliminado" });
            fetchMaterials();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Materiales (Joyería)</CardTitle>
                <CardDescription>
                    Administre los tipos de materiales disponibles para las piezas (Oro, Plata, etc.).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder="Nombre del material (Ej: Oro 18K, Plata 925...)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        disabled={loading}
                    />
                    <Button type="submit" disabled={loading || !newName.trim()}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Añadir
                    </Button>
                </form>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="w-[130px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fetching ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                        No hay materiales registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                materials.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-medium">
                                            {editingId === m.id ? (
                                                <Input
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleSaveEdit(m.id);
                                                        if (e.key === "Escape") handleCancelEdit();
                                                    }}
                                                    autoFocus
                                                    className="h-8"
                                                />
                                            ) : (
                                                m.name
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {editingId === m.id ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                                                            onClick={() => handleSaveEdit(m.id)}
                                                            disabled={editLoading}
                                                        >
                                                            {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:bg-muted h-8 w-8"
                                                            onClick={handleCancelEdit}
                                                            disabled={editLoading}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                                                            onClick={() => handleStartEdit(m)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                            onClick={() => handleDelete(m.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
