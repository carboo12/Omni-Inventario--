"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, CategoryWithChildren } from '@/lib/actions/categories';
import { useToast } from '@/hooks/use-toast';
import { CategoryDialog } from '@/components/inventory/category-dialog';
import { cn } from '@/lib/utils';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Recursive Tree Item Component
const CategoryTreeItem = ({
    category,
    level = 0,
    onEdit,
    onDelete,
    onAddSub
}: {
    category: CategoryWithChildren,
    level?: number,
    onEdit: (cat: CategoryWithChildren) => void,
    onDelete: (cat: CategoryWithChildren) => void,
    onAddSub: (cat: CategoryWithChildren) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = category.children && category.children.length > 0;

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group transition-colors",
                    level > 0 && "ml-4 border-l pl-2"
                )}
            >
                <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => hasChildren && setIsOpen(!isOpen)}>
                    <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                        {hasChildren ? (
                            isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        ) : <div className="w-4" />}
                    </div>
                    {isOpen ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-blue-500" />}
                    <span className="font-medium text-sm">{category.name}</span>
                    {category._count && (
                        <span className="text-xs text-muted-foreground ml-2">
                            ({category._count?.product ?? 0} prods)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddSub(category)} title="Agregar Subcategoría">
                        <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(category)} title="Editar">
                        <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(category)} title="Eliminar">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>
            {isOpen && hasChildren && (
                <div className="mt-1">
                    {category.children.map(child => (
                        <CategoryTreeItem
                            key={child.id}
                            category={child}
                            level={level + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddSub={onAddSub}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CategoriesPage() {
    const { toast } = useToast();
    const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<CategoryWithChildren | null>(null);

    // Flattened options for parent selection (just id and name)
    const [parentOptions, setParentOptions] = useState<{ id: string, name: string }[]>([]);

    const loadData = async () => {
        setIsLoading(true);
        const result = await getCategories(); // This returns flat list currently based on my action implementation logic comment
        if (result.success && result.data) {
            // We need to build the tree client side if the server returns flat list
            // Assuming server returns flat list for simplicity of "select options", we build both tree and options here.
            // Actually, my action `getCategories` was mixed. Let's assume it returns all categories flat.
            const flatList = result.data as any[];
            setParentOptions(flatList.map(c => ({ id: c.id, name: c.name })));

            // Build Tree
            const buildTree = (cats: any[], parentId: string | null = null): CategoryWithChildren[] => {
                return cats
                    .filter(cat => cat.parentId === parentId)
                    .map(cat => ({
                        ...cat,
                        children: buildTree(cats, cat.id)
                    }));
            };
            setCategories(buildTree(flatList));
        } else {
            toast({ title: "Error", description: "No se pudieron cargar las categorías.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSave = async (data: any) => {
        let result;
        if (data.id) {
            result = await updateCategory(data.id, {
                name: data.name,
                description: data.description,
                parentId: data.parentId
            });
        } else {
            result = await createCategory(data);
        }

        if (result.success) {
            toast({ title: "Éxito", description: "Categoría guardada correctamente." });
            loadData();
        } else {
            toast({ title: "Error", description: result.error || "Falló la operación.", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        const result = await deleteCategory(itemToDelete.id);
        if (result.success) {
            toast({ title: "Éxito", description: "Categoría eliminada." });
            loadData();
        } else {
            toast({ title: "Error", description: result.error || "No se pudo eliminar.", variant: "destructive" });
        }
        setDeleteAlertOpen(false);
        setItemToDelete(null);
    };

    const openAddDialog = (parent?: CategoryWithChildren) => {
        setEditingCategory(parent ? { parentId: parent.id } as any : null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (category: CategoryWithChildren) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const confirmDelete = (category: CategoryWithChildren) => {
        setItemToDelete(category);
        setDeleteAlertOpen(true);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
                    <p className="text-muted-foreground">Gestione la jerarquía de categorías de sus productos.</p>
                </div>
                <Button onClick={() => openAddDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Categoría Raíz
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Árbol de Categorías</CardTitle>
                    <CardDescription>
                        Despliegue las carpetas para ver subcategorías. Utilice los botones para editar o agregar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">Cargando...</div>
                    ) : (
                        <div className="space-y-1">
                            {categories.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">No hay categorías creadas.</p>
                            ) : (
                                categories.map(cat => (
                                    <CategoryTreeItem
                                        key={cat.id}
                                        category={cat}
                                        onEdit={openEditDialog}
                                        onDelete={confirmDelete}
                                        onAddSub={openAddDialog}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <CategoryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSave}
                category={editingCategory}
                parentOptions={parentOptions}
            />

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Asegúrese de que la categoría no tenga productos ni subcategorías antes de eliminarla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
