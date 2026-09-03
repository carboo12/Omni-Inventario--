"use client";

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Loader2, FolderTree } from 'lucide-react';
import { deleteCategory } from '@/lib/actions/categories';
import { useToast } from '@/hooks/use-toast';

type Category = {
    id: string;
    name: string;
    description: string | null;
    inventoryType: string;
    parentId: string | null;
    category?: {
        id: string;
        name: string;
    } | null;
    _count: {
        product: number;
        other_category: number;
    };
};

interface CategoryTableProps {
    categories: Category[];
    loading: boolean;
    onEdit: (category: Category) => void;
    onDeleteSuccess: () => void;
    inventoryType: 'pharmacy' | 'general';
}

export function CategoryTable({
    categories,
    loading,
    onEdit,
    onDeleteSuccess,
    inventoryType
}: CategoryTableProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        const result = await deleteCategory(categoryToDelete.id);

        if (result.success) {
            toast({
                title: "Éxito",
                description: "Categoría eliminada correctamente",
            });
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
            onDeleteSuccess();
        } else {
            toast({
                title: "Error",
                description: result.error || "Error al eliminar categoría",
                variant: "destructive",
            });
        }
        setIsDeleting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-12">
                <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hay categorías</h3>
                <p className="text-sm text-muted-foreground mt-2">
                    Crea tu primera categoría para organizar tus {inventoryType === 'pharmacy' ? 'medicamentos' : 'productos'}
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Categoría Padre</TableHead>
                            <TableHead className="text-center">Productos</TableHead>
                            <TableHead className="text-center">Subcategorías</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                    {category.description || <span className="text-muted-foreground italic">Sin descripción</span>}
                                </TableCell>
                                <TableCell>
                                    {category.category ? (
                                        <Badge variant="outline">{category.category.name}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={category._count.product > 0 ? "default" : "secondary"}>
                                        {category._count.product}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={category._count.other_category > 0 ? "default" : "secondary"}>
                                        {category._count.other_category}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(category)}
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClick(category)}
                                            title="Eliminar"
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la categoría{' '}
                            <span className="font-semibold">{categoryToDelete?.name}</span>.
                            {categoryToDelete && (
                                <>
                                    {categoryToDelete._count.product > 0 && (
                                        <p className="mt-2 text-destructive font-medium">
                                            ⚠️ Esta categoría tiene {categoryToDelete._count.product} producto(s) asignado(s).
                                        </p>
                                    )}
                                    {categoryToDelete._count.other_category > 0 && (
                                        <p className="mt-2 text-destructive font-medium">
                                            ⚠️ Esta categoría tiene {categoryToDelete._count.other_category} subcategoría(s).
                                        </p>
                                    )}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
