"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Crown, Loader2 } from 'lucide-react';
import { uploadLogo, removeLogo } from '@/lib/actions/upload-logo';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LogoUploaderProps {
    currentLogo?: string | null;
    isPremium: boolean;
    onLogoChange?: () => void;
}

export function LogoUploader({ currentLogo, isPremium, onLogoChange }: LogoUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validar que sea SVG
        if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
            toast({
                title: "Error",
                description: "Solo se permiten archivos SVG",
                variant: "destructive"
            });
            return;
        }

        // Validar tamaño (100KB)
        if (file.size > 100000) {
            toast({
                title: "Error",
                description: "El archivo es demasiado grande. Máximo 100KB",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);

        try {
            const svgContent = await file.text();
            const result = await uploadLogo(svgContent);

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Logo subido correctamente"
                });
                onLogoChange?.();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Error al subir logo",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Error al procesar el archivo",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        setIsUploading(true);
        try {
            const result = await removeLogo();

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Logo eliminado correctamente"
                });
                onLogoChange?.();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Error al eliminar logo",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Error al eliminar logo",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            setShowDeleteDialog(false);
        }
    };

    if (!isPremium) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Logo Personalizado</CardTitle>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Premium
                        </Badge>
                    </div>
                    <CardDescription>
                        Agrega el logo de tu negocio a los tickets impresos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/50">
                        <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">Funcionalidad Premium</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Esta funcionalidad está disponible solo con licencia premium
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Contacta con soporte para actualizar tu licencia
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Logo Personalizado</CardTitle>
                        <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600">
                            <Crown className="h-3 w-3" />
                            Premium
                        </Badge>
                    </div>
                    <CardDescription>
                        Sube un logo SVG para mostrar en tus tickets (máximo 100KB)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Preview del logo actual */}
                    {currentLogo && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Logo actual:</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDeleteDialog(true)}
                                    disabled={isUploading}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Eliminar
                                </Button>
                            </div>
                            <div
                                className="flex justify-center items-center bg-white rounded p-4 min-h-[100px]"
                                dangerouslySetInnerHTML={{ __html: currentLogo }}
                            />
                        </div>
                    )}

                    {/* Botón de subida */}
                    <div className="flex flex-col gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".svg,image/svg+xml"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {currentLogo ? 'Cambiar Logo' : 'Subir Logo'}
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Solo archivos SVG • Máximo 100KB
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo de confirmación para eliminar */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar logo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el logo de tu negocio. Podrás subir uno nuevo en cualquier momento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUploading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveLogo}
                            disabled={isUploading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
