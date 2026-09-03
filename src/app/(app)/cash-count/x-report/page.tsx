"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCashRegister } from "@/hooks/use-cash-register";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRouter } from '@/lib/router-nav';
import { useEffect, useState } from "react";
import { getSessionOutflows } from "@/lib/actions/cash-register";

export default function XReportPage() {
    const { activeSession: session } = useCashRegister();
    const { user } = useAuth();
    const router = useRouter();
    const [outflows, setOutflows] = useState<any[]>([]);

    useEffect(() => {
        if (session) {
            getSessionOutflows(session.id).then(setOutflows);
        }
        // If no session, wait a bit or redirect. useCashRegister might take a moment to load
    }, [session]);

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <p>Cargando datos de sesiÃ³n...</p>
                <Button variant="link" onClick={() => router.push("/cash-count")}>Volver</Button>
            </div>
        )
    };

    const handlePrint = () => {
        window.print();
    };

    const totalOutflows = outflows.reduce((acc, o) => acc + Number(o.amount || 0), 0);
    const totalReturns = session?.totalReturns || 0;
    const expectedCash = (session?.initialAmount || 0) + (session?.salesCash || 0) + ((session as any)?.salesAbonos || 0) - totalOutflows - totalReturns;

    return (
        <div className="flex flex-col items-center p-6 space-y-6">
            <div className="w-full max-w-2xl flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold">Reporte X (Solo Lectura)</h1>
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => router.push("/cash-count")}>Volver</Button>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                </div>
            </div>

            <Card className="w-full max-w-sm bg-white shadow-lg print:shadow-none" id="print-area">
                <CardContent className="p-4 font-mono text-sm space-y-4">
                    <div className="text-center border-b border-dashed pb-4 border-gray-400">
                        <h2 className="text-xl font-bold">Omni Inventario +</h2>
                        <p>Sucursal Central</p>
                        <p>RUC: J0310000000000</p>
                        <h3 className="text-lg font-bold mt-4">CIERRE X</h3>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>CAJA:</span>
                            <span>01</span>
                        </div>
                        <div className="flex justify-between">
                            <span>CAJERO:</span>
                            <span>{session.cashierName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>APERTURA:</span>
                            <span>{new Date(session.openingTime).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>IMPRESION:</span>
                            <span>{new Date().toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-400 pt-2 space-y-1">
                        <div className="flex justify-between font-bold">
                            <span>DESCRIPCION</span>
                            <span>VALOR</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>FONDO INICIAL:</span>
                            <span>{session.initialAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VENTAS EFECTIVO:</span>
                            <span>{session.salesCash?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VENTAS TARJETA:</span>
                            <span>{session.salesCard?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VENTAS DOLARES:</span>
                            <span>{session.salesUSD?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                            <span>SALIDAS / RETIROS:</span>
                            <span>-{totalOutflows.toFixed(2)}</span>
                        </div>
                        {totalReturns > 0 && (
                            <div className="flex justify-between text-red-500">
                                <span>DEVOLUCIONES:</span>
                                <span>-{totalReturns.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {outflows.length > 0 && (
                        <div className="border-t border-dashed border-gray-400 pt-2">
                            <div className="font-bold">DETALLE SALIDAS / RETIROS</div>
                            <div className="space-y-1 mt-1">
                                {outflows.map(o => (
                                    <div key={o.id} className="text-xs">
                                        <div>{new Date(o.createdAt).toLocaleTimeString()} {new Date(o.createdAt).toLocaleDateString()}</div>
                                        <div className="flex justify-between">
                                            <span className="flex-1">{o.reason}</span>
                                            <span>-{Number(o.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="text-gray-500">Usuario: {session.cashierName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-dashed border-gray-400 pt-2">
                        <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL VENTAS:</span>
                            <span>{session.totalSales?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex justify-between font-semibold mt-2">
                            <span>EFECTIVO EN CAJA:</span>
                            <span>{expectedCash.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-8 text-center text-xs">
                        <p>*** FIN DEL REPORTE ***</p>
                    </div>
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                        color: #000000 !important;
                        text-shadow: 0 0 0.3px #000 !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        padding: 0 2mm 15mm 2mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
