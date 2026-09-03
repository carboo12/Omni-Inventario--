"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { exportJewelryCsv, importJewelryCsv } from "@/lib/actions/jewelry-production";
import { useToast } from "@/hooks/use-toast";

export function JewelryExportImport() {
    const { settings } = useSettings();
    const { toast } = useToast();
    const [loadingExport, setLoadingExport] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Export Tienda B inventory when in HOME mode
    const handleExport = async () => {
        setLoadingExport(true);
        try {
            const res = await exportJewelryCsv("B");
            if (res.success && res.data) {
                // Trigger download
                const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `inventario_tienda_b_${new Date().toISOString().split("T")[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast({ title: "Exportación Exitosa", description: "CSV descargado." });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Fallo al exportar", variant: "destructive" });
        } finally {
            setLoadingExport(false);
        }
    };

    // Import Tienda B inventory when in STORE_B mode
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoadingImport(true);
        try {
            const text = await file.text();
            const res = await importJewelryCsv(text, "B");
            if (res.success) {
                toast({ title: "Importación Exitosa", description: `Se importaron ${res.count} piezas a Inventario B.` });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Fallo al leer archivo", variant: "destructive" });
        } finally {
            setLoadingImport(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center gap-2">
            {settings.jewelryLocationMode === "HOME" && (
                <Button 
                    variant="outline" 
                    className="flex text-[#673AB7] border-[#673AB7] hover:bg-purple-50"
                    onClick={handleExport}
                    disabled={loadingExport}
                >
                    {loadingExport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Exportar Inventario B (CSV)
                </Button>
            )}

            {settings.jewelryLocationMode === "STORE_B" && (
                <>
                    <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                    />
                    <Button 
                        variant="outline" 
                        className="flex text-[#8BC34A] border-[#8BC34A] hover:bg-green-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loadingImport}
                    >
                        {loadingImport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Importar CSV (Tienda B)
                    </Button>
                </>
            )}
        </div>
    );
}
