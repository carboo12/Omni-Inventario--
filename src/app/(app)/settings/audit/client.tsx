"use client";

import React, { useState, useMemo } from 'react';
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
    History, 
    Eye, 
    ShieldAlert, 
    User, 
    Calendar as CalendarIcon,
    ArrowLeft,
    FilterX
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from '@/lib/router-nav';

interface AuditLog {
    id: string;
    timestamp: Date | string;
    userId: string;
    userName: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    metadata?: any;
    ipAddress?: string;
}

interface AuditClientProps {
    initialLogs: AuditLog[];
}

export default function AuditClient({ initialLogs }: AuditClientProps) {
    const [logs] = useState<AuditLog[]>(initialLogs);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => 
            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [logs, searchTerm]);

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATE': return <Badge className="bg-green-500">Creación</Badge>;
            case 'UPDATE': return <Badge className="bg-blue-500">Actualización</Badge>;
            case 'DELETE': return <Badge variant="destructive">Eliminación</Badge>;
            case 'LOGIN': return <Badge variant="outline" className="border-amber-500 text-amber-500">Inicio Sesión</Badge>;
            case 'PRICE_CHANGE': return <Badge className="bg-purple-500 text-white">Cambio Precio</Badge>;
            default: return <Badge variant="secondary">{action}</Badge>;
        }
    };

    const getEntityBadge = (entity: string) => {
        return <Badge variant="outline" className="font-mono text-[10px] uppercase">{entity}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/settings">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                        Log de Auditoría
                    </h1>
                    <p className="text-muted-foreground">Historial completo de eventos y acciones administrativas del sistema.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por usuario, acción o descripción..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchTerm && (
                            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-10">
                                <FilterX className="mr-2 h-4 w-4" />
                                Limpiar Filtros
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                                    <TableHead className="w-[150px]">Usuario</TableHead>
                                    <TableHead className="w-[120px]">Acción</TableHead>
                                    <TableHead className="w-[120px]">Módulo</TableHead>
                                    <TableHead>Descripción del Evento</TableHead>
                                    <TableHead className="text-right">Detalle</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                                    {format(new Date(log.timestamp), "dd MMM, HH:mm:ss", { locale: es })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <span className="font-medium text-sm">{log.userName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(log.action)}
                                            </TableCell>
                                            <TableCell>
                                                {getEntityBadge(log.entity)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.description}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => setSelectedLog(log)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No se han registrado eventos recientemente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Log Detail Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Detalle del Evento
                        </DialogTitle>
                        <DialogDescription>
                            Información técnica completa del registro de auditoría.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedLog && (
                        <div className="flex-1 overflow-y-auto space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-muted-foreground font-semibold uppercase text-[10px]">ID de Registro</p>
                                    <p className="font-mono text-xs">{selectedLog.id}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold uppercase text-[10px]">Dirección IP</p>
                                    <p className="font-mono text-xs">{selectedLog.ipAddress || 'Localhost / Desconocida'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold uppercase text-[10px]">Entidad Afectada</p>
                                    <p className="font-mono text-xs">{selectedLog.entity} ({selectedLog.entityId || 'N/A'})</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold uppercase text-[10px]">Acción Ejecutada</p>
                                    <p className="font-bold">{selectedLog.action}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Metadatos del Cambio (JSON)</p>
                                <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-x-auto">
                                    <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
