'use client';

import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Wallet, History, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    updateCustomerCredit, 
    getCustomerStatement 
} from '@/lib/actions/customers';
import { formatCurrency, cn, formatTicketNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useCashRegister } from '@/hooks/use-cash-register';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreditHistorySheet } from '@/components/customers/credit-history-sheet';
import { CreditPaymentDialog } from '@/components/pos/credit-payment-dialog';

interface CreditManagementClientProps {
    initialCustomers: any[];
}

export default function CreditManagementClient({ initialCustomers }: CreditManagementClientProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { activeSession } = useCashRegister();
    const [customers, setCustomers] = useState(initialCustomers);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Selected Customer State
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isStatementOpen, setIsStatementOpen] = useState(false);

    // Form States
    const [creditLimit, setCreditLimit] = useState(0);
    const [hasCredit, setHasCredit] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentNotes, setPaymentNotes] = useState('');
    const [statementData, setStatementData] = useState<any | null>(null);

    const filteredCustomers = customers.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.documentId && c.documentId.includes(searchTerm))
    );

    const handleOpenSettings = (customer: any) => {
        setSelectedCustomer(customer);
        setCreditLimit(customer.creditLimit || 0);
        setHasCredit(customer.hasCredit || false);
        setIsSettingsOpen(true);
    };

    const handleSaveSettings = async () => {
        if (!selectedCustomer) return;
        setIsLoading(true);
        const result = await updateCustomerCredit(selectedCustomer.id, {
            hasCredit,
            creditLimit: Number(creditLimit)
        });

        if (result.success) {
            setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, hasCredit, creditLimit } : c));
            toast({ title: "Configuración Actualizada", description: "El crédito del cliente ha sido modificado." });
            setIsSettingsOpen(false);
        } else {
            toast({ title: "Error", description: "No se pudo actualizar la configuración.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleOpenPayment = (customer: any) => {
        if (customer.currentBalance <= 0) {
            toast({ title: "Sin Saldo Pendiente", description: "Este cliente no tiene deudas activas." });
            return;
        }
        if (!activeSession) {
            toast({ title: "Error", description: "Debe haber una sesión de caja activa para recibir pagos.", variant: "destructive" });
            return;
        }
        setSelectedCustomer(customer);
        setPaymentAmount(customer.currentBalance);
        setIsPaymentOpen(true);
    };

    const handleViewStatement = async (customer: any) => {
        setSelectedCustomer(customer);
        setIsLoading(true);
        const result = await getCustomerStatement(customer.id);
        if (result.success) {
            setStatementData(result.data);
            setIsStatementOpen(true);
        }
        setIsLoading(false);
    };

    // Combine sales and payments for Kardex view
    const kardexItems = useMemo(() => {
        if (!statementData) return [];
        const items = [
            ...(statementData.sales || []).map((s: any) => ({
                id: s.id,
                date: new Date(s.date),
                type: 'VENTA',
                ref: `Factura #${formatTicketNumber(s.invoiceNumber)}`,
                debit: s.totalAmount,
                credit: 0
            })),
            ...(statementData.creditPayments || []).map((p: any) => ({
                id: p.id,
                date: new Date(p.timestamp),
                type: 'ABONO',
                ref: `Recibo #${p.receiptNumber}`,
                debit: 0,
                credit: p.amount
            }))
        ];
        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [statementData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-primary uppercase">Gestión de Cuentas por Cobrar</h1>
                    <p className="text-muted-foreground font-medium">Controle los límites de crédito y registre abonos de sus clientes.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar cliente por nombre o ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 text-lg border-primary/20"
                    />
                </div>
            </div>

            <Card className="border-t-4 border-t-primary shadow-xl">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Cartera de Clientes
                    </CardTitle>
                    <CardDescription>Lista completa de clientes y su estado financiero actual.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Cliente</TableHead>
                                <TableHead className="font-bold">Estado</TableHead>
                                <TableHead className="font-bold text-right">Límite</TableHead>
                                <TableHead className="font-bold text-right">Saldo Deudor</TableHead>
                                <TableHead className="font-bold text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id} className="hover:bg-primary/5 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg">{customer.fullName}</span>
                                                <span className="text-xs text-muted-foreground">{customer.documentId || 'Sin ID'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {customer.hasCredit ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> CRÉDITO ACTIVO
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="opacity-50">SIN CRÉDITO</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : 'Sin Límite'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "text-xl font-black",
                                                customer.currentBalance > 0 ? "text-red-600" : "text-green-600"
                                            )}>
                                                {formatCurrency(customer.currentBalance)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleViewStatement(customer)} title="Ver Estado de Cuenta">
                                                    <History className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenSettings(customer)} title="Configurar Crédito">
                                                    <CreditCard className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    className="bg-primary hover:bg-primary/90 text-white" 
                                                    size="sm" 
                                                    onClick={() => handleOpenPayment(customer)}
                                                    disabled={customer.currentBalance <= 0}
                                                >
                                                    <Wallet className="h-4 w-4 mr-2" />
                                                    ABONAR
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No se encontraron clientes que coincidan con la búsqueda.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog: Credit Settings */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configuración de Crédito</DialogTitle>
                        <DialogDescription>Defina el estado y límite de crédito para {selectedCustomer?.fullName}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Habilitar Crédito</Label>
                                <p className="text-sm text-muted-foreground">Permite realizar ventas al crédito a este cliente.</p>
                            </div>
                            <Switch 
                                checked={hasCredit} 
                                onCheckedChange={setHasCredit} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Límite de Crédito (C$)</Label>
                            <Input 
                                type="number" 
                                value={creditLimit} 
                                onChange={(e) => setCreditLimit(Number(e.target.value))}
                                className="text-lg font-bold"
                            />
                            <p className="text-xs text-muted-foreground">Use 0 para crédito ilimitado (no recomendado).</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Record Payment (con comprobante imprimible de 80mm) */}
            <CreditPaymentDialog
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                customer={selectedCustomer}
                sessionId={activeSession?.id || ''}
                userId={user?.id || 'system'}
                userName={user?.name || 'Cajero'}
                onSuccess={() => {
                    if (selectedCustomer) {
                        setCustomers(customers.map(c =>
                            c.id === selectedCustomer.id
                                ? { ...c, currentBalance: Math.max(0, (c.currentBalance || 0) - paymentAmount) }
                                : c
                        ));
                    }
                    setPaymentNotes('');
                }}
            />

            {/* Dialog: Customer Statement (Kardex) */}
            <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-primary">FICHA DE CRÉDITO INTELIGENTE</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-4 min-h-[400px]">
                        {statementData && (
                            <CreditHistorySheet 
                                customer={statementData} 
                                onClose={() => setIsStatementOpen(false)} 
                            />
                        )}
                    </div>
                    
                    <DialogFooter className="mt-4 border-t pt-4">
                        <Button variant="outline" onClick={() => setIsStatementOpen(false)}>Cerrar Ficha</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
