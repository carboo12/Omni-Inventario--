'use client';

import React, { useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createSupplier } from '@/lib/actions/suppliers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from '@/lib/router-nav';

const supplierSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    nit: z.string().min(1, "El NIT es requerido"),
    phone: z.string().min(1, "El teléfono es requerido"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function NewSupplierPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            nit: '',
            phone: '',
            email: '',
            address: '',
            city: '',
        },
    });

    const onSubmit = async (data: SupplierFormValues) => {
        setIsSubmitting(true);
        try {
            const result = await createSupplier({
                ...data,
                email: data.email || null,
                address: data.address || null,
                city: data.city || null,
                status: 'Active'
            });

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Proveedor creado correctamente",
                });
                router.push('/suppliers');
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Error al crear proveedor",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error inesperado",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Link href="/suppliers">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Añadir Nuevo Proveedor</h1>
                    <p className="text-muted-foreground">
                        Complete el formulario para registrar un nuevo proveedor.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información del Proveedor</CardTitle>
                    <CardDescription>
                        Ingrese los datos básicos y de contacto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre de la Empresa <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: Distribuidora Farmacéutica S.A." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="nit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NIT / RUC <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: 1234567890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: +505 8888-8888" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Correo Electrónico</FormLabel>
                                            <FormControl>
                                                <Input placeholder="contacto@empresa.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ciudad</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: Managua" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dirección Completa</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: Km 4 Carretera Norte..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t">
                                <Link href="/suppliers">
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar Proveedor
                                        </>
                                    )}
                                </Button>
                            </div>

                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
