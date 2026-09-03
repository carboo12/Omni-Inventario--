"use client";

import React, { useState, useMemo } from 'react';
import type { Customer } from '@prisma/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Search, 
    UserPlus, 
    Pencil, 
    Trash2, 
    CreditCard, 
    MoreHorizontal,
    Phone,
    MapPin,
    IdCard
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createOrUpdateCustomer, deleteCustomer, getAllCustomers } from '@/lib/actions/customers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomersClientProps {
    initialCustomers?: Customer[];
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'master-admin';
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
        queryKey: ['customers'],
        queryFn: () => getAllCustomers(),
        initialData: initialCustomers,
    });
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dialog states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        fullName: '',
        documentId: '',
        phone: '',
        address: '',
        hasCredit: false,
        creditLimit: 0,
        priceLevel: 1
    });

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.documentId && c.documentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.phone && c.phone.includes(searchTerm))
        );
    }, [customers, searchTerm]);

    const handleOpenEdit = (customer?: Customer) => {
        if (customer) {
            setSelectedCustomer(customer);
            setFormData({
                fullName: customer.fullName,
                documentId: customer.documentId || '',
                phone: customer.phone || '',
                address: customer.address || '',
                hasCredit: customer.hasCredit,
                creditLimit: customer.creditLimit,
                priceLevel: (customer as any).priceLevel || 1
            });
        } else {
            setSelectedCustomer(null);
            setFormData({
                fullName: '',
                documentId: '',
                phone: '',
                address: '',
                hasCredit: false,
                creditLimit: 0,
                priceLevel: 1
            });
        }
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) {
            toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const result = await createOrUpdateCustomer({
                ...formData,
                documentId: formData.documentId || null,
                phone: formData.phone || null,
                address: formData.address || null,
                // SEGURIDAD: si el usuario no es Admin, forzar crédito deshabilitado
                hasCredit: isAdmin ? formData.hasCredit : false,
                creditLimit: isAdmin ? formData.creditLimit : 0
            });

            queryClient.invalidateQueries({ queryKey: ['customers'] });
            if (selectedCustomer) {
                toast({ title: "Cliente actualizado", description: "Los datos se han guardado correctamente." });
            } else {
                toast({ title: "Cliente creado", description: "El nuevo cliente ha sido registrado." });
            }
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar el cliente.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCustomer || !user) return;

        try {
            const result = await deleteCustomer(selectedCustomer.id, user.id, user.name);
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['customers'] });
                toast({ title: "Cliente eliminado", description: "El registro ha sido borrado." });
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedCustomer(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
                    <p className="text-muted-foreground">Administre la base de datos de sus clientes y sus límites de crédito.</p>
                </div>
                <Button onClick={() => handleOpenEdit()}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, cédula o teléfono..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Identificación</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Crédito</TableHead>
                                    <TableHead>Nivel</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{customer.fullName}</span>
                                                    {customer.address && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <MapPin className="h-3 w-3" /> {customer.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <IdCard className="h-4 w-4 text-muted-foreground" />
                                                    <span>{customer.documentId || 'No registrado'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {customer.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                                        <span>{customer.phone}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">Sin teléfono</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {customer.hasCredit ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className="w-fit bg-green-500 hover:bg-green-600 border-transparent text-white">Activo</Badge>
                                                        <span className="text-xs font-semibold">
                                                            Límite: C$ {customer.creditLimit.toLocaleString()}
                                                        </span>
                                                        <span className="text-xs text-destructive">
                                                            Saldo: C$ {customer.currentBalance.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline">Sin Crédito</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">Nivel {((customer as any).priceLevel || 1)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleOpenEdit(customer)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => {
                                                                setSelectedCustomer(customer);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            {isLoadingCustomers ? 'Cargando clientes...' : 'No se encontraron clientes.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                        <DialogDescription>
                            Ingrese los datos personales y de crédito del cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Nombre Completo</Label>
                            <Input 
                                id="fullName" 
                                value={formData.fullName} 
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="documentId">Identificación (Cédula)</Label>
                                <Input 
                                    id="documentId" 
                                    value={formData.documentId} 
                                    onChange={(e) => setFormData({...formData, documentId: e.target.value})}
                                    placeholder="001-XXXXXX-XXXXX"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input 
                                    id="phone" 
                                    value={formData.phone} 
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="8888-8888"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input 
                                id="address" 
                                value={formData.address} 
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                placeholder="Barrio, Calle, No. Casa"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="priceLevel">Nivel de Precio</Label>
                            <select
                                id="priceLevel"
                                value={formData.priceLevel}
                                onChange={(e) => setFormData({...formData, priceLevel: parseInt(e.target.value)})}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value={1}>Nivel 1 — General</option>
                                <option value={2}>Nivel 2</option>
                                <option value={3}>Nivel 3</option>
                                <option value={4}>Nivel 4 — Mayorista</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox 
                                id="hasCredit" 
                                checked={formData.hasCredit}
                                disabled={!isAdmin}
                                onCheckedChange={(checked) => setFormData({...formData, hasCredit: !!checked})}
                            />
                            <Label htmlFor="hasCredit" className="font-semibold text-primary">Habilitar línea de crédito</Label>
                            {!isAdmin && <span className="text-xs text-muted-foreground">(Solo administrador)</span>}
                        </div>
                        {formData.hasCredit && (
                            <div className="grid gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <Label htmlFor="creditLimit">Límite de Crédito (C$)</Label>
                                <Input 
                                    id="creditLimit" 
                                    type="number"
                                    disabled={!isAdmin}
                                    value={formData.creditLimit} 
                                    onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el perfil del cliente
                            <strong> {selectedCustomer?.fullName}</strong> y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Cliente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
