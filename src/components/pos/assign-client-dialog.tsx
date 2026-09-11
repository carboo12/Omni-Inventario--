"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Phone, MapPin, CreditCard, IdCard, CheckCircle2, ChevronRight } from 'lucide-react';
import { getAllCustomers, createOrUpdateCustomer } from '@/lib/actions/customers';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface SelectedClient {
    id?: string;
    name: string;
    phone?: string;
    priceLevel?: number;
}

interface AssignClientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (client: SelectedClient) => void;
    currentName?: string;
}

export function AssignClientDialog({
    isOpen,
    onClose,
    onAssign,
    currentName = '',
}: AssignClientDialogProps) {
    const { toast } = useToast();
    const [view, setView] = useState<'search' | 'form'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        fullName: '',
        documentId: '',
        phone: '',
        address: '',
        hasCredit: false,
        creditLimit: 0
    });

    useEffect(() => {
        if (isOpen) {
            loadCustomers();
            setSearchTerm('');
            setView('search');
            setFormData({
                fullName: currentName === 'ANONIM' ? '' : currentName,
                documentId: '',
                phone: '',
                address: '',
                hasCredit: false,
                creditLimit: 0
            });
        }
    }, [isOpen, currentName]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await getAllCustomers();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.documentId && c.documentId.includes(searchTerm)) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    const handleSelectCustomer = (customer: any) => {
        onAssign({
            id: customer.id,
            name: customer.fullName,
            phone: customer.phone || undefined,
            priceLevel: customer.priceLevel || 1,
        });
        onClose();
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) {
            toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const res = await createOrUpdateCustomer(formData);
            onAssign({
                id: res.id,
                name: res.fullName,
                phone: res.phone || undefined,
                priceLevel: (res as any).priceLevel || 1,
            });
            toast({ title: "✅ Éxito", description: "Cliente guardado y asignado" });
            onClose();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar el cliente", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="px-4 py-4 bg-slate-900 text-white shrink-0">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        {view === 'search' ? <Search className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {view === 'search' ? 'Buscar Cliente' : 'Nuevo Cliente'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {view === 'search' ? (
                        <div className="p-4 flex flex-col h-full overflow-hidden">
                            <div className="relative mb-3 shrink-0">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, cédula o teléfono..."
                                    className="pl-9 h-11"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <ScrollArea className="flex-1 -mx-2 px-2 min-h-0">
                                <div className="space-y-2">
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(customer => (
                                            <div 
                                                key={customer.id} 
                                                className="group p-3 rounded-xl border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between"
                                                onClick={() => handleSelectCustomer(customer)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                        {customer.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{customer.fullName}</p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            {customer.documentId && <span className="flex items-center gap-1"><IdCard className="w-3 h-3" /> {customer.documentId}</span>}
                                                            {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {customer.hasCredit && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px]">CRÉDITO</Badge>}
                                                    {(customer.priceLevel || 1) > 1 && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px]">NIVEL {customer.priceLevel}</Badge>}
                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <p className="mb-4">No se encontraron clientes</p>
                                            <Button variant="outline" onClick={() => setView('form')}>
                                                <UserPlus className="w-4 h-4 mr-2" />
                                                Crear Nuevo Cliente
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            
                            <div className="mt-4 pt-4 border-t shrink-0">
                                <Button className="w-full" variant="secondary" onClick={() => setView('form')}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Registrar Nuevo Cliente
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500">Nombre Completo</Label>
                                    <div className="relative">
                                        <Input 
                                            placeholder="Ej: Juan Pérez" 
                                            className="h-11"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-500">Cédula / RUC</Label>
                                        <Input 
                                            placeholder="000-000000-0000X" 
                                            className="h-11"
                                            value={formData.documentId}
                                            onChange={(e) => setFormData({...formData, documentId: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-500">Teléfono</Label>
                                        <Input 
                                            placeholder="8888-8888" 
                                            className="h-11"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-500">Dirección</Label>
                                    <Input 
                                        placeholder="Dirección completa..." 
                                        className="h-11"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    />
                                </div>

                                <div className="pt-2 border-t mt-2">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Checkbox 
                                            id="hasCredit" 
                                            checked={formData.hasCredit} 
                                            onCheckedChange={(c) => setFormData({...formData, hasCredit: !!c})} 
                                        />
                                        <Label htmlFor="hasCredit" className="text-sm font-bold text-slate-700 cursor-pointer">
                                            Habilitar Línea de Crédito
                                        </Label>
                                    </div>

                                    {formData.hasCredit && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Label className="text-xs font-black uppercase text-slate-500">Límite de Crédito (C$)</Label>
                                            <Input 
                                                type="number"
                                                placeholder="0.00" 
                                                className="h-11 border-primary/30"
                                                value={formData.creditLimit}
                                                onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-4 py-3 bg-slate-50 border-t shrink-0">
                    <Button variant="outline" onClick={view === 'form' ? () => setView('search') : onClose} className="h-11 px-6">
                        {view === 'form' ? 'Volver' : 'Cancelar'}
                    </Button>
                    {view === 'form' && (
                        <Button onClick={handleSave} disabled={loading || !formData.fullName.trim()} className="h-11 px-8 bg-primary font-bold">
                            {loading ? 'Guardando...' : 'Guardar y Asignar'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
