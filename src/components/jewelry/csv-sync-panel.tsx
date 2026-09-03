"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { exportJewelryInventoryCSV, importJewelryInventoryCSV, exportJewelrySalesCSV, importJewelrySalesCSV } from "@/lib/actions/csv-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DownloadCloud, UploadCloud, FileSpreadsheet, AlertTriangle, RefreshCw } from "lucide-react";

export function CsvSyncPanel() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isExportingInv, setIsExportingInv] = useState(false);
    const [isImportingInv, setIsImportingInv] = useState(false);
    const [isExportingSales, setIsExportingSales] = useState(false);
    const [isImportingSales, setIsImportingSales] = useState(false);

    const downloadCsv = (csvString: string, filename: string) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportInventory = async () => {
        setIsExportingInv(true);
        try {
            const exportLoc = user?.role === 'master-admin' ? 'ALL' : user?.assignedLocation;
            const res = await exportJewelryInventoryCSV(exportLoc);
            if (res.success && res.data) {
                const filename = `inventario_joyeria_${exportLoc || 'ALL'}_${new Date().getTime()}.csv`;
                downloadCsv(res.data, filename);
                toast({ title: "Exportación Existosa", description: `Inventario de Local ${exportLoc || 'General'} descargado.` });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } finally {
            setIsExportingInv(false);
        }
    };

    const handleImportInventory = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImportingInv(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await importJewelryInventoryCSV(formData);
            if (res.success) {
                toast({ title: "Importación Existosa", description: res.message });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } finally {
            setIsImportingInv(false);
            e.target.value = ""; // Reset input
        }
    };

    const handleExportSales = async () => {
        setIsExportingSales(true);
        try {
            const exportLoc = user?.assignedLocation || "ALL";
            const res = await exportJewelrySalesCSV(exportLoc);
            if (res.success && res.data) {
                const filename = `ventas_joyeria_${exportLoc}_${new Date().getTime()}.csv`;
                downloadCsv(res.data, filename);
                toast({ title: "Exportación Existosa", description: `Ventas de Local ${exportLoc} descargadas.` });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } finally {
            setIsExportingSales(false);
        }
    };

    const handleImportSales = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImportingSales(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await importJewelrySalesCSV(formData, user?.id || "");
            if (res.success) {
                toast({ title: "Sincronización Existosa", description: res.message });
            } else {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            }
        } finally {
            setIsImportingSales(false);
            e.target.value = ""; // Reset input
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-[#673AB7]">
                <RefreshCw className="w-6 h-6" />
                Sincronización por USB / CSV
            </h1>
            
            <div className="grid md:grid-cols-2 gap-6">
                
                {/* INVENTARIO */}
                <Card className="border-t-4 border-t-[#03A9F4]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-[#03A9F4]"/> 
                            Sincronizar Inventario
                        </CardTitle>
                        <CardDescription>
                            Para llevar productos nuevos al local o actualizar precios. El administrador debe exportarlo en su PC y luego el local debe importarlo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg flex flex-col gap-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-[#03A9F4] text-white rounded-full text-xs">1</span> 
                                Exportar (Desde Casa)
                            </h3>
                            <Button 
                                variant="outline" 
                                className="w-full sm:w-auto self-start"
                                onClick={handleExportInventory}
                                disabled={isExportingInv}
                            >
                                <DownloadCloud className="w-4 h-4 mr-2" />
                                {isExportingInv ? "Generando..." : "Descargar CSV de Inventario"}
                            </Button>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg flex flex-col gap-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-[#03A9F4] text-white rounded-full text-xs">2</span> 
                                Importar (En el Local)
                            </h3>
                            <div className="flex gap-2 items-center">
                                <Input 
                                    type="file" 
                                    accept=".csv"
                                    className="cursor-pointer"
                                    onChange={handleImportInventory}
                                    disabled={isImportingInv}
                                />
                                {isImportingInv && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* VENTAS */}
                <Card className="border-t-4 border-t-[#8BC34A]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-[#8BC34A]"/> 
                            Sincronizar Ventas
                        </CardTitle>
                        <CardDescription>
                            Para subir las ventas del día a la base de datos principal en Casa. El local debe exportarlo y el cajero/administrador importarlo en la PC principal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg flex flex-col gap-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-[#8BC34A] text-white rounded-full text-xs">A</span> 
                                Exportar (Desde el Local al cierre)
                            </h3>
                            <Button 
                                variant="outline" 
                                className="w-full sm:w-auto self-start border-[#8BC34A] text-[#8BC34A] hover:bg-[#8BC34A]/10"
                                onClick={handleExportSales}
                                disabled={isExportingSales}
                            >
                                <DownloadCloud className="w-4 h-4 mr-2" />
                                {isExportingSales ? "Generando..." : `Descargar Ventas (Local ${user?.assignedLocation || 'ALL'})`}
                            </Button>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg flex flex-col gap-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-[#8BC34A] text-white rounded-full text-xs">B</span> 
                                Importar (En Casa para consolidar)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Solo suba el archivo de ventas si está en su casa o en la central.
                            </p>
                            <div className="flex gap-2 items-center">
                                <Input 
                                    type="file" 
                                    accept=".csv"
                                    className="cursor-pointer file:text-[#8BC34A]"
                                    onChange={handleImportSales}
                                    disabled={isImportingSales}
                                />
                                {isImportingSales && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md flex items-start gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                    <strong>Nota Importante:</strong> Esta función está diseñada para operar sin internet de forma manual. Sea muy cuidadoso de no importar archivos viejos de ventas dos veces, o el archivo incorrecto. Asegúrese de limpiar la USB o usar nombres de archivo organizados por fechas para evitar confusiones.
                </p>
            </div>
        </div>
    );
}

