"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, FolderTree, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategories } from '@/lib/actions/categories';
import { CategoryDialog } from '@/components/categories/category-dialog';
import { CategoryTable } from '@/components/categories/category-table';
import { useToast } from '@/hooks/use-toast';
import { useBusinessMode } from '@/hooks/use-business-mode';

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

export function CategoriesClient() {
    const { mode } = useBusinessMode();
    const isBoutique = (mode as string) === 'BOUTIQUE';
    const isDistribuidora = (mode as string) === 'DISTRIBUIDORA';
    const defaultsToGeneral = isBoutique || isDistribuidora;
    const [activeTab, setActiveTab] = useState<'pharmacy' | 'general'>(defaultsToGeneral ? 'general' : 'pharmacy');
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const { toast } = useToast();

    const loadCategories = async () => {
        setLoading(true);
        const result = await getCategories(activeTab);

        if (result.success && result.data) {
            setCategories(result.data as Category[]);
            setFilteredCategories(result.data as Category[]);
        } else {
            toast({
                title: "Error",
                description: result.error || "Error al cargar categorías",
                variant: "destructive"
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadCategories();
    }, [activeTab]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredCategories(categories);
        } else {
            const filtered = categories.filter(cat =>
                cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredCategories(filtered);
        }
    }, [searchTerm, categories]);

    const handleNewCategory = () => {
        setEditingCategory(null);
        setDialogOpen(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setDialogOpen(true);
    };

    const handleDialogClose = (shouldRefresh?: boolean) => {
        setDialogOpen(false);
        setEditingCategory(null);
        if (shouldRefresh) {
            loadCategories();
        }
    };

    const handleDeleteSuccess = () => {
        loadCategories();
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
                    <p className="text-muted-foreground">
                        Gestiona las categorías de tus productos
                    </p>
                </div>
                <Button onClick={handleNewCategory}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pharmacy' | 'general')}>
                {!isBoutique && (
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="pharmacy" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Medicamentos
                        </TabsTrigger>
                        <TabsTrigger value="general" className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4" />
                            Productos Generales
                        </TabsTrigger>
                    </TabsList>
                )}

                <TabsContent value={activeTab} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {isBoutique ? 'Categorías de Boutique' : isDistribuidora ? 'Categorías de Distribuidora' : activeTab === 'pharmacy' ? 'Categorías de Medicamentos' : 'Categorías de Productos Generales'}
                            </CardTitle>
                            <CardDescription>
                                {isBoutique 
                                    ? 'Organiza tus prendas, zapatos y accesorios por categorías' 
                                    : isDistribuidora
                                        ? 'Organiza los productos de tu distribuidora por categorías'
                                        : activeTab === 'pharmacy'
                                            ? 'Organiza tus medicamentos por categorías para facilitar su gestión'
                                            : 'Organiza tus productos generales por categorías para facilitar su gestión'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar categorías..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <CategoryTable
                                categories={filteredCategories}
                                loading={loading}
                                onEdit={handleEditCategory}
                                onDeleteSuccess={handleDeleteSuccess}
                                inventoryType={activeTab}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CategoryDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                category={editingCategory}
                inventoryType={activeTab}
                existingCategories={categories}
            />
        </div>
    );
}
