'use client';

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useBusinessMode } from '@/hooks/use-business-mode';

interface ImportInventoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[], mode: 'create' | 'update') => Promise<any>;
}

interface ParsedRow {
    productName: string;
    barcode?: string;
    category: string;
    priceNIO: number;
    costPriceNIO: number;
    minStock: number;
    unitOfMeasure: 'unit' | 'bulk' | 'box' | 'blister';
    inventoryType: 'pharmacy' | 'general' | 'jewelry';
    batch?: string;
    quantity: number;
    expiryDate?: string;
    brand?: string;
    size?: string;
    color?: string;
    gender?: string;
    subCategory?: string;
    // Niveles de precio (escalas)
    price2?: number;
    price3?: number;
    price4?: number;
    // Unidades / empaques / conversión
    baseUnit?: string;
    bulkUnit?: string;
    unitsPerBox?: number;
    isFractional?: boolean;
    hasBoxOption?: boolean;
}

export function ImportInventoryDialog({ isOpen, onClose, onImport }: ImportInventoryDialogProps) {
    const { toast } = useToast();
    const { mode } = useBusinessMode();
    const isBoutique = (mode as string) === 'BOUTIQUE';
    const isDistribuidora = (mode as string) === 'DISTRIBUIDORA';
    const defaultsToGeneral = isBoutique || isDistribuidora;
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [importMode, setImportMode] = useState<'create' | 'update'>('create');

    const downloadTemplate = () => {
        let template = [];
        
        if (isBoutique) {
            template = [
                {
                    'Nombre del Producto': 'Jean Slim Fit',
                    'Marca': 'Levis',
                    'Talla': '30',
                    'Color': 'Azul Indigo',
                    'Género': 'Hombre',
                    'Código de Barras': '987654001',
                    'Categoría': 'Pantalones',
                    'Subcategoría': 'Slim Fit',
                    'Precio de Venta (C$)': 1200.00,
                    'Precio de Costo (C$)': 600.00,
                    'Stock Mínimo': 3,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 10
                },
                {
                    'Nombre del Producto': 'Jean Slim Fit',
                    'Marca': 'Levis',
                    'Talla': '32',
                    'Color': 'Azul Indigo',
                    'Género': 'Hombre',
                    'Código de Barras': '987654002',
                    'Categoría': 'Pantalones',
                    'Subcategoría': 'Slim Fit',
                    'Precio de Venta (C$)': 1200.00,
                    'Precio de Costo (C$)': 600.00,
                    'Stock Mínimo': 3,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 15
                },
                {
                    'Nombre del Producto': 'Jean Slim Fit',
                    'Marca': 'Levis',
                    'Talla': '34',
                    'Color': 'Negro',
                    'Género': 'Hombre',
                    'Código de Barras': '987654003',
                    'Categoría': 'Pantalones',
                    'Subcategoría': 'Slim Fit',
                    'Precio de Venta (C$)': 1200.00,
                    'Precio de Costo (C$)': 600.00,
                    'Stock Mínimo': 3,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 8
                },
                {
                    'Nombre del Producto': 'Camiseta Oversize',
                    'Marca': 'Urban Style',
                    'Talla': 'S',
                    'Color': 'Blanco',
                    'Género': 'Unisex',
                    'Código de Barras': '123456001',
                    'Categoría': 'Camisetas',
                    'Subcategoría': 'Oversize',
                    'Precio de Venta (C$)': 450.00,
                    'Precio de Costo (C$)': 200.00,
                    'Stock Mínimo': 5,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 12
                },
                {
                    'Nombre del Producto': 'Camiseta Oversize',
                    'Marca': 'Urban Style',
                    'Talla': 'M',
                    'Color': 'Blanco',
                    'Género': 'Unisex',
                    'Código de Barras': '123456002',
                    'Categoría': 'Camisetas',
                    'Subcategoría': 'Oversize',
                    'Precio de Venta (C$)': 450.00,
                    'Precio de Costo (C$)': 200.00,
                    'Stock Mínimo': 5,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 20
                },
                {
                    'Nombre del Producto': 'Camiseta Oversize',
                    'Marca': 'Urban Style',
                    'Talla': 'XL',
                    'Color': 'Negro',
                    'Género': 'Unisex',
                    'Código de Barras': '123456003',
                    'Categoría': 'Camisetas',
                    'Subcategoría': 'Oversize',
                    'Precio de Venta (C$)': 450.00,
                    'Precio de Costo (C$)': 200.00,
                    'Stock Mínimo': 5,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Cantidad': 24
                }
            ];
        } else {
            template = [
                {
                    'Nombre del Producto': 'Paracetamol 500mg',
                    'Código de Barras': '7501234567890',
                    'Categoría': 'Analgésicos',
                    'Precio_Nivel_1': 25.50,
                    'Precio_Nivel_2': 22.00,
                    'Precio_Nivel_3': 20.00,
                    'Precio_Nivel_4': 18.00,
                    'Unidad_Base': 'unidad',
                    'Presentacion_Empaque': 'caja',
                    'Cantidad_Por_Empaque': 24,
                    'Es_Fraccionable': 'FALSE',
                    'Precio de Costo': 15.00,
                    'Stock Mínimo': 50,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'pharmacy',
                    'Lote': 'LOT-2024-001',
                    'Cantidad': 100,
                    'Fecha de Vencimiento': '2025-12-31'
                },
                {
                    'Nombre del Producto': 'Arroz Paca 25lbs',
                    'Código de Barras': '7501234567891',
                    'Categoría': 'Granos Básicos',
                    'Precio_Nivel_1': 55.00,
                    'Precio_Nivel_2': 52.00,
                    'Precio_Nivel_3': 50.00,
                    'Precio_Nivel_4': 48.00,
                    'Unidad_Base': 'libra',
                    'Presentacion_Empaque': 'paca',
                    'Cantidad_Por_Empaque': 25,
                    'Es_Fraccionable': 'TRUE',
                    'Precio de Costo': 45.00,
                    'Stock Mínimo': 100,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Lote': 'STOCK-INICIAL',
                    'Cantidad': 500,
                    'Fecha de Vencimiento': '2099-12-31'
                },
                {
                    'Nombre del Producto': 'Frijol Quintal 100lbs',
                    'Código de Barras': '7501234567892',
                    'Categoría': 'Granos Básicos',
                    'Precio_Nivel_1': 65.00,
                    'Precio_Nivel_2': 62.00,
                    'Precio_Nivel_3': 60.00,
                    'Precio_Nivel_4': 58.00,
                    'Unidad_Base': 'libra',
                    'Presentacion_Empaque': 'quintal',
                    'Cantidad_Por_Empaque': 100,
                    'Es_Fraccionable': 'TRUE',
                    'Precio de Costo': 52.00,
                    'Stock Mínimo': 100,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Lote': 'STOCK-INICIAL',
                    'Cantidad': 1000,
                    'Fecha de Vencimiento': '2099-12-31'
                },
                {
                    'Nombre del Producto': 'Aceite Bidón 20L',
                    'Código de Barras': '7501234567894',
                    'Categoría': 'Abarrotes',
                    'Precio_Nivel_1': 950.00,
                    'Precio_Nivel_2': 930.00,
                    'Precio_Nivel_3': 910.00,
                    'Precio_Nivel_4': 890.00,
                    'Unidad_Base': 'litro',
                    'Presentacion_Empaque': 'bidón',
                    'Cantidad_Por_Empaque': 20,
                    'Es_Fraccionable': 'TRUE',
                    'Precio de Costo': 800.00,
                    'Stock Mínimo': 50,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Lote': 'STOCK-INICIAL',
                    'Cantidad': 200,
                    'Fecha de Vencimiento': '2099-12-31'
                },
                {
                    'Nombre del Producto': 'Anillos / Aretes (sin empaque)',
                    'Código de Barras': '7501234567893',
                    'Categoría': 'Accesorios',
                    'Precio_Nivel_1': 150.00,
                    'Precio_Nivel_2': 0,
                    'Precio_Nivel_3': 0,
                    'Precio_Nivel_4': 0,
                    'Unidad_Base': 'unidad',
                    'Presentacion_Empaque': '',
                    'Cantidad_Por_Empaque': 1,
                    'Es_Fraccionable': 'FALSE',
                    'Precio de Costo': 80.00,
                    'Stock Mínimo': 10,
                    'Unidad de Medida': 'unit',
                    'Tipo de Inventario': 'general',
                    'Lote': 'STOCK-INICIAL',
                    'Cantidad': 50,
                    'Fecha de Vencimiento': '2099-12-31'
                }
            ];
        }

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

        // Set column widths
        if (isBoutique) {
            ws['!cols'] = [
                { wch: 25 }, // Nombre
                { wch: 15 }, // Marca
                { wch: 10 }, // Talla
                { wch: 15 }, // Color
                { wch: 12 }, // Género
                { wch: 18 }, // Barcode
                { wch: 20 }, // Categoria
                { wch: 20 }, // Subcategoria
                { wch: 15 }, // Precio Venta
                { wch: 15 }, // Precio Costo
                { wch: 12 }, // Stock Min
                { wch: 15 }, // Unidad
                { wch: 15 }, // Tipo
                { wch: 10 }  // Cantidad
            ];
        } else {
            ws['!cols'] = [
                { wch: 28 }, // Nombre
                { wch: 18 }, // Barcode
                { wch: 20 }, // Categoría
                { wch: 14 }, // Precio_Nivel_1
                { wch: 14 }, // Precio_Nivel_2
                { wch: 14 }, // Precio_Nivel_3
                { wch: 14 }, // Precio_Nivel_4
                { wch: 14 }, // Unidad_Base
                { wch: 18 }, // Presentacion_Empaque
                { wch: 18 }, // Cantidad_Por_Empaque
                { wch: 16 }, // Es_Fraccionable
                { wch: 15 }, // Precio de Costo
                { wch: 12 }, // Stock Mínimo
                { wch: 15 }, // Unidad de Medida
                { wch: 15 }, // Tipo de Inventario
                { wch: 18 }, // Lote
                { wch: 10 }, // Cantidad
                { wch: 20 }, // Fecha de Vencimiento
            ];
        }

        XLSX.writeFile(wb, isBoutique ? 'plantilla_boutique.xlsx' : 'plantilla_inventario.xlsx');
        toast({ title: 'Plantilla descargada', description: 'Use esta plantilla para importar su inventario.' });
    };

    // Helper to normalize a cell value: treats 'NULL', 'null', '', 'NINGUNO' as empty
    const normalizeCell = (val: any): string => {
        if (val === undefined || val === null) return '';
        const s = val.toString().trim();
        if (s.toUpperCase() === 'NULL' || s.toUpperCase() === 'NINGUNO') return '';
        return s;
    };

    const validateRow = (row: any, index: number): { valid: boolean; data?: ParsedRow; error?: string } => {
        const errors: string[] = [];

        const productName = normalizeCell(row['Nombre del Producto']);
        const category = normalizeCell(row['Categoría']);
        // Precio nivel 1 (base/detalle): acepta Precio_Nivel_1 o legacy "Precio de Venta (C$)".
        const priceRaw = row['Precio_Nivel_1'] !== undefined && row['Precio_Nivel_1'] !== null
            ? row['Precio_Nivel_1']
            : (row['Precio_Detalle'] !== undefined && row['Precio_Detalle'] !== null
                ? row['Precio_Detalle']
                : row['Precio de Venta (C$)']);
        // Cantidad: treat NULL string or missing as 0 (stock 0 is valid for a new listing)
        const cantidadRaw = row['Cantidad'];
        const cantidadStr = normalizeCell(cantidadRaw);
        const cantidad = cantidadStr === '' ? 0 : Number(cantidadStr);

        // Required fields
        if (!productName) errors.push(`Fila ${index + 2}: Falta nombre del producto`);
        if (!category) errors.push(`Fila ${index + 2}: Falta categoría`);
        if (!priceRaw && priceRaw !== 0) errors.push(`Fila ${index + 2}: Falta precio de venta`);
        if (isNaN(Number(priceRaw))) errors.push(`Fila ${index + 2}: Precio de venta inválido`);
        if (isNaN(cantidad)) errors.push(`Fila ${index + 2}: Cantidad inválida`);

        if (!isBoutique && !isDistribuidora) {
            if (!normalizeCell(row['Lote'])) errors.push(`Fila ${index + 2}: Falta lote`);
            if (!row['Fecha de Vencimiento']) errors.push(`Fila ${index + 2}: Falta fecha de vencimiento`);
        }

        // Validate unit of measure — default to 'unit' if missing
        const unitRaw = normalizeCell(row['Unidad de Medida']);
        const validUnits = ['unit', 'bulk', 'box', 'blister'];
        const unit = validUnits.includes(unitRaw) ? unitRaw : 'unit';

        // Validate inventory type
        const invTypeRaw = normalizeCell(row['Tipo de Inventario']);
        const validTypes = ['pharmacy', 'general', 'jewelry'];
        if (invTypeRaw && !validTypes.includes(invTypeRaw)) {
            errors.push(`Fila ${index + 2}: Tipo de inventario inválido (use: pharmacy, general, jewelry)`);
        }

        if (errors.length > 0) {
            return { valid: false, error: errors.join('; ') };
        }

        // Normalize size: empty string means no size (treated as NINGUNO)
        const sizeVal = normalizeCell(row['Talla']) || undefined;
        const colorVal = normalizeCell(row['Color']) || undefined;
        const barcodeVal = normalizeCell(row['Código de Barras']) || undefined;

        // Niveles de precio (escalas). 0 o vacío => no definido.
        const numOrUndef = (v: any): number | undefined => {
            const s = normalizeCell(v);
            if (s === '') return undefined;
            const n = Number(s);
            return isNaN(n) || n <= 0 ? undefined : n;
        };
        // Mapeo de las 4 columnas de precio de la plantilla a los niveles del producto.
        // priceNIO = Precio_Nivel_1 (base/detalle), price2 = Nivel 2 (bulto/paca),
        // price3 = Nivel 3 (mayorista/volumen), price4 = Nivel 4 (especial/distribución).
        const price2 = numOrUndef(row['Precio_Nivel_2']);
        const price3 = numOrUndef(row['Precio_Nivel_3']);
        const price4 = numOrUndef(row['Precio_Nivel_4']);

        // Costo: acepta "Precio de Costo" (nuevo) o legacy "Precio de Costo (C$)".
        const costRaw = row['Precio de Costo'] !== undefined && row['Precio de Costo'] !== null
            ? row['Precio de Costo']
            : row['Precio de Costo (C$)'];

        // Unidades / empaques / conversión
        const baseUnit = normalizeCell(row['Unidad_Base']) || undefined;
        const bulkUnit = normalizeCell(row['Presentacion_Empaque']) || undefined;
        const unitsPerBox = numOrUndef(row['Cantidad_Por_Empaque']) || 1;
        const hasBoxOption = Boolean(bulkUnit && unitsPerBox > 1);
        // Es_Fraccionable (TRUE/FALSE) define si permite cantidades decimales.
        // Fallback: granos/líquidos por libra, litro, quintal, paca, saco, bidón.
        const fracRaw = normalizeCell(row['Es_Fraccionable']).toUpperCase();
        const isFractional = Boolean(
            fracRaw === 'TRUE' || fracRaw === '1' || fracRaw === 'SI'
            || (baseUnit && /libra|litro/i.test(baseUnit))
            || (bulkUnit && /paca|quintal|qq|saco|bidón|bidon/i.test(bulkUnit))
        );

        return {
            valid: true,
            data: {
                productName,
                barcode: barcodeVal,
                category,
                priceNIO: Number(priceRaw),
                costPriceNIO: Number(normalizeCell(costRaw) || 0),
                minStock: Number(normalizeCell(row['Stock Mínimo']) || 1),
                unitOfMeasure: unit as any,
                inventoryType: (validTypes.includes(invTypeRaw) ? invTypeRaw : (defaultsToGeneral ? 'general' : 'pharmacy')) as any,
                batch: normalizeCell(row['Lote']) || (defaultsToGeneral ? 'STOCK-INICIAL' : 'LOTE-GENERAL'),
                quantity: cantidad,
                expiryDate: normalizeCell(row['Fecha de Vencimiento']) || '2099-12-31',
                brand: normalizeCell(row['Marca']) || undefined,
                size: sizeVal,
                color: colorVal,
                gender: normalizeCell(row['Género']) || undefined,
                subCategory: normalizeCell(row['Subcategoría']) || undefined,
                price2,
                price3,
                price4,
                baseUnit,
                bulkUnit,
                unitsPerBox,
                isFractional,
                hasBoxOption,
            }
        };
    };

    const handleFileChange = useCallback((selectedFile: File | null) => {
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
            toast({
                title: 'Archivo inválido',
                description: 'Por favor seleccione un archivo Excel (.xlsx o .xls)',
                variant: 'destructive'
            });
            return;
        }

        setFile(selectedFile);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const validationErrors: string[] = [];
                const validData: ParsedRow[] = [];

                jsonData.forEach((row, index) => {
                    const result = validateRow(row, index);
                    if (result.valid && result.data) {
                        validData.push(result.data);
                    } else if (result.error) {
                        validationErrors.push(result.error);
                    }
                });

                // Set issues if any
                setErrors(validationErrors);
                setParsedData(validData);

                if (validData.length > 0) {
                    toast({
                        title: 'Archivo procesado',
                        description: `${validData.length} productos válidos encontrados${validationErrors.length > 0 ? `, ${validationErrors.length} errores encontrados` : ''}.`
                    });
                }
            } catch (error) {
                console.error('Error parsing Excel:', error);
                toast({
                    title: 'Error al procesar archivo',
                    description: 'No se pudo leer el archivo Excel. Verifique el formato.',
                    variant: 'destructive'
                });
            }
        };

        reader.readAsArrayBuffer(selectedFile);
    }, [toast]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };


    const handleImport = async () => {
        if (parsedData.length === 0) {
            toast({
                title: 'No hay datos para importar',
                description: 'Por favor seleccione un archivo válido.',
                variant: 'destructive'
            });
            return;
        }

        setIsImporting(true);
        setProgress(0);
        setStatusMessage('Iniciando importación...');

        try {
            // Chunking the import to show real progress
            const chunkSize = 100;
            const totalChunks = Math.ceil(parsedData.length / chunkSize);
            
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, parsedData.length);
                const chunk = parsedData.slice(start, end);
                
                setStatusMessage(`Importando lote ${i + 1} de ${totalChunks} (${start} a ${end})...`);
                
                // Call the import function for this chunk
                await onImport(chunk, importMode);
                
                const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
                setProgress(currentProgress);
            }

            setStatusMessage('Importación completada con éxito!');
            toast({
                title: 'Importación exitosa',
                description: `${parsedData.length} productos importados correctamente.`
            });
            
            // Wait a moment for the user to see 100%
            setTimeout(() => {
                handleClose();
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Import error:', error);
            setStatusMessage('Error durante la importación.');
            toast({
                title: 'Error en la importación',
                description: 'Ocurrió un error al importar los datos.',
                variant: 'destructive'
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setIsImporting(false);
        setImportMode('create');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Importar Inventario desde Excel</DialogTitle>
                    <DialogDescription>
                        Descargue la plantilla, complete los datos y súbala para importar su inventario.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 pr-2 space-y-4">
                    {/* Download Template Button */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-medium">Plantilla de Excel</p>
                                <p className="text-sm text-muted-foreground">Descargue la plantilla para comenzar</p>
                            </div>
                        </div>
                        <Button onClick={downloadTemplate} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Plantilla
                        </Button>
                    </div>

                    {/* Import Mode Selection */}
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium">Modo de Importación</Label>
                        <RadioGroup value={importMode} onValueChange={(value: 'create' | 'update') => setImportMode(value)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="create" id="mode-create" />
                                <Label htmlFor="mode-create" className="font-normal cursor-pointer">
                                    <span className="font-medium">Crear nuevos lotes</span>
                                    <p className="text-xs text-muted-foreground">Agrega productos como nuevos lotes de inventario (recomendado)</p>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="update" id="mode-update" />
                                <Label htmlFor="mode-update" className="font-normal cursor-pointer">
                                    <span className="font-medium">Actualizar productos existentes</span>
                                    <p className="text-xs text-muted-foreground">Actualiza precios y categorías de productos que ya existen</p>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* File Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-lg font-medium mb-1">
                            {file ? file.name : 'Arrastra tu archivo Excel aquí'}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                            o haz clic para seleccionar
                        </p>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload">
                            <Button variant="secondary" asChild>
                                <span>Seleccionar Archivo</span>
                            </Button>
                        </label>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-medium mb-2">Se encontraron {errors.length} errores:</p>
                                <ScrollArea className="h-24">
                                    <ul className="text-sm space-y-1">
                                        {errors.slice(0, 10).map((error, i) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                        {errors.length > 10 && <li>... y {errors.length - 10} más</li>}
                                    </ul>
                                </ScrollArea>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Progress Bar */}
                    {isImporting && (
                        <div className="space-y-3 p-4 border rounded-xl bg-primary/5 animate-in fade-in zoom-in duration-300">
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm font-bold text-primary">{statusMessage}</span>
                                </div>
                                <span className="text-sm font-black text-primary">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-3 shadow-inner bg-primary/20" />
                            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-bold">
                                No cierre esta ventana hasta que la importación finalice
                            </p>
                        </div>
                    )}

                    {/* Preview Summary */}
                    {parsedData.length > 0 && (
                        <div className="space-y-2">
                            <Alert className="bg-green-50 border-green-200 text-green-800">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <AlertDescription className="text-base font-bold">
                                    {parsedData.length} productos procesados correctamente y listos para importar.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                    <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={parsedData.length === 0 || isImporting}
                        className="min-w-[140px]"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importando...
                            </>
                        ) : (
                            `Importar ${parsedData.length} Productos`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
