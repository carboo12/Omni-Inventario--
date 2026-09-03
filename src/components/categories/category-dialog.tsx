"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createCategory, updateCategory } from '@/lib/actions/categories';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useBusinessMode } from '@/hooks/use-business-mode';

const categorySchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional(),
    parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
    open: boolean;
    onClose: (shouldRefresh?: boolean) => void;
    category?: {
        id: string;
        name: string;
        description: string | null;
        parentId: string | null;
    } | null;
    inventoryType: 'pharmacy' | 'general';
    existingCategories: Array<{
        id: string;
        name: string;
        parentId: string | null;
    }>;
}

export function CategoryDialog({
    open,
    onClose,
    category,
    inventoryType,
    existingCategories
}: CategoryDialogProps) {
    const { mode } = useBusinessMode();
    const isBoutique = (mode as string) === 'BOUTIQUE';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            description: '',
            parentId: undefined,
        },
    });

    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                description: category.description || '',
                parentId: category.parentId || undefined,
            });
        } else {
            form.reset({
                name: '',
                description: '',
                parentId: undefined,
            });
        }
    }, [category, form, open]);

    const onSubmit = async (data: CategoryFormData) => {
        setIsSubmitting(true);

        const categoryData = {
            name: data.name,
            description: data.description || null,
            inventoryType,
            parentId: data.parentId && data.parentId !== 'none' ? data.parentId : null,
        };

        try {
            let result;
            if (category) {
                result = await updateCategory(category.id, categoryData);
            } else {
                result = await createCategory(categoryData);
            }

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: category ? "Categoría actualizada correctamente" : "Categoría creada correctamente",
                });
                onClose(true);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Error al guardar categoría",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Error inesperado al guardar categoría",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtrar categorías disponibles como padre (excluir la actual y sus hijos)
    const availableParentCategories = existingCategories.filter(cat => {
        if (category && cat.id === category.id) return false;
        if (category && cat.parentId === category.id) return false;
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {category ? 'Editar Categoría' : 'Nueva Categoría'} - {isBoutique ? 'Boutique' : inventoryType === 'pharmacy' ? 'Medicamentos' : 'Productos Generales'}
                    </DialogTitle>
                    <DialogDescription>
                        {category
                            ? 'Modifica los datos de la categoría'
                            : 'Completa los datos para crear una nueva categoría'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={isBoutique ? "Ej: Calzado de Dama" : "Ej: Analgésicos"} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descripción de la categoría (opcional)"
                                            className="resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría Padre (opcional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sin categoría padre" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Sin categoría padre</SelectItem>
                                            {availableParentCategories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Selecciona una categoría padre para crear una subcategoría
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onClose()}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {category ? 'Actualizar' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
