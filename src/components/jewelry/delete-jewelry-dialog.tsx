"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteJewelryPiece } from "@/lib/actions/jewelry-production";

interface DeleteJewelryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    piece: {
        id: string;
        code?: string | null;
        name: string;
    } | null;
}

export function DeleteJewelryDialog({ open, onOpenChange, piece }: DeleteJewelryDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!piece) return;

        if (!password) {
            toast({
                title: "Error",
                description: "Debe ingresar la Llave Maestra para continuar.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const result = await deleteJewelryPiece(piece.id, password);

            if (result.success) {
                toast({
                    title: "Pieza Eliminada",
                    description: "La joya ha sido eliminada y los códigos reordenados exitosamente."
                });
                onOpenChange(false);
                setPassword("");
            } else {
                toast({
                    title: "Error",
                    description: result.error || "No se pudo eliminar la pieza.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-red-100 p-3 rounded-full mb-2 w-fit">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <DialogTitle className="text-center">¿Eliminar esta pieza?</DialogTitle>
                    <DialogDescription className="text-center text-red-600 font-medium">
                        Esta acción es irreversible. Se eliminará "{piece?.name}" y se reordenarán los códigos correlativos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleDelete} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="master-key-delete" className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-primary" />
                            Llave Maestra de Administrador
                        </Label>
                        <Input
                            id="master-key-delete"
                            type="password"
                            placeholder="Ingrese la llave maestra"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Esta acción requiere autorización de nivel master-admin.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar Eliminación
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
