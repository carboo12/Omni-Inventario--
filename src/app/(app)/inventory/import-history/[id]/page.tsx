import { getImportDetails } from '@/lib/actions/import-history';
import { notFound } from '@/lib/router-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from '@/lib/router-nav';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export default async function ImportDetailsPage({ params }: { params: { id: string } }) {
    const result = await getImportDetails(params.id);

    if (!result.success || !result.data) {
        notFound();
    }

    const record = result.data;
    const errors = (record.errors as string[]) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory/import-history">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
                        Detalles de Importación
                    </h1>
                    <p className="text-muted-foreground">
                        {record.fileName}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Información General */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Archivo</p>
                                <p className="font-medium">{record.fileName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Importado por</p>
                                <p className="font-medium">{record.user.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{record.user.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Fecha</p>
                                <p className="font-medium">
                                    {format(new Date(record.importedAt), 'PPPp', { locale: es })}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Modo</p>
                            <Badge variant={record.mode === 'create' ? 'default' : 'secondary'}>
                                {record.mode === 'create' ? 'Crear Nuevos Lotes' : 'Actualizar Productos'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Estadísticas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estadísticas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Filas</p>
                                <p className="text-2xl font-bold">{record.totalRows}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Exitosas</p>
                                <p className="text-2xl font-bold text-green-600">{record.successfulRows}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Con Errores</p>
                                <p className="text-2xl font-bold text-red-600">{record.failedRows}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                                <p className="text-2xl font-bold">
                                    {((record.successfulRows / record.totalRows) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 border-t space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {record.mode === 'create' ? 'Productos Creados' : 'Productos Actualizados'}
                                </span>
                                <span className="font-medium">
                                    {record.mode === 'create' ? record.productsCreated : record.productsUpdated}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Items de Inventario Creados</span>
                                <span className="font-medium">{record.inventoryItemsCreated}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Errores */}
            {errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Errores Encontrados ({errors.length})
                        </CardTitle>
                        <CardDescription>
                            Lista de errores ocurridos durante la importación
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64">
                            <div className="space-y-2">
                                {errors.map((error, index) => (
                                    <Alert key={index} variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
