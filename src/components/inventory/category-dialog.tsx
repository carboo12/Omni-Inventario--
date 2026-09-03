"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryWithChildren } from '@/lib/actions/categories';

const formSchema = z.object({
    name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
    description: z.string().optional(),
    parentId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FormValues & { id?: string }) => Promise<void>;
    category?: CategoryWithChildren | null;
    parentOptions: { id: string, name: string }[];
}

export function CategoryDialog({ isOpen, onClose, onSave, category, parentOptions }: CategoryDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            parentId: 'root', // Use 'root' string for null in Select? Or handle empty string logic
        }
    });

    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: category?.name || '',
                description: category?.description || '',
                parentId: category?.parentId || 'root',
            });
        }
    }, [category, isOpen, form]);

    const handleSubmit = async (values: FormValues) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const dataToSave = {
                ...values,
                id: category?.id,
                parentId: values.parentId === 'root' ? null : values.parentId
            };
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error("Error saving category", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isSaving && !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{category ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                    <DialogDescription>
                        {category ? 'Modifique los detalles de la categoría.' : 'Cree una nueva categoría para organizar sus productos.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Medicamentos" {...field} disabled={isSaving} />
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
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Breve descripción..." {...field} disabled={isSaving} />
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
                                    <FormLabel>Categoría Padre</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || 'root'}
                                        disabled={isSaving}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione una categoría padre" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="root">-- Ninguna (Categoría Raíz) --</SelectItem>
                                            {parentOptions.map((opt) => (
                                                // Prevent selecting itself as parent or circular dependency (simple check: id !== category.id)
                                                opt.id !== category?.id && (
                                                    <SelectItem key={opt.id} value={opt.id}>
                                                        {opt.name}
                                                    </SelectItem>
                                                )
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
