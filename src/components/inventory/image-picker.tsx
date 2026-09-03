"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { uploadProductImage } from '@/lib/actions/upload-image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImagePickerProps {
    value?: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    className?: string;
}

export function ImagePicker({ value, onChange, disabled, className }: ImagePickerProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamaño localmente (opcional)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "Imagen demasiado grande",
                description: "El tamaño máximo es de 5MB.",
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const result = await uploadProductImage(formData);
            if (result.success && result.data) {
                setPreview(result.data);
                onChange(result.data);
                toast({ title: "Imagen subida correctamente" });
            } else {
                throw new Error(result.error || "Error desconocido");
            }
        } catch (error: any) {
            toast({
                title: "Error al subir imagen",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        setPreview(null);
        onChange("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div 
                className={cn(
                    "relative flex aspect-square w-full max-w-[200px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted",
                    preview && "border-none bg-transparent"
                )}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            >
                {preview ? (
                    <div className="relative h-full w-full">
                        <img 
                            src={preview} 
                            alt="Preview" 
                            className="h-full w-full rounded-lg object-cover"
                        />
                        {!disabled && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage();
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        {isUploading ? (
                            <Loader2 className="h-10 w-10 animate-spin" />
                        ) : (
                            <>
                                <ImageIcon className="h-10 w-10" />
                                <span className="text-xs font-medium">Click para añadir imagen</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={disabled || isUploading}
                // 'capture' attribute helps on mobile to open camera directly if specified
                // but usually leaving it out allows user to choose camera or gallery
            />

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Archivo
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:hidden" // Solo visible en mobile
                    onClick={() => {
                        if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('capture', 'environment');
                            fileInputRef.current.click();
                            fileInputRef.current.removeAttribute('capture');
                        }
                    }}
                    disabled={disabled || isUploading}
                >
                    <Camera className="mr-2 h-4 w-4" />
                    Cámara
                </Button>
            </div>
        </div>
    );
}
