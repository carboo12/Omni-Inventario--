import { GoldPurchaseForm } from "@/components/jewelry/gold-purchase-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Info } from "lucide-react";
import { getGoldPurchaseHistory } from "@/lib/actions/gold-purchase";
import { getSettings } from "@/lib/actions/settings";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BusinessGuard } from "@/lib/business-guard";
import { redirect } from '@/lib/router-nav';

export default async function GoldPurchasePage() {
    const mode = await BusinessGuard.getCurrentMode();
    if (mode !== 'JEWELRY') redirect('/dashboard');

    const [historyRes, settings] = await Promise.all([
        getGoldPurchaseHistory(5),
        getSettings(),
    ]);
    const history = historyRes.success ? historyRes.data : [];
    const exchangeRate = parseFloat(settings.exchangeRate || "36.5");

    return (
        <div className="flex flex-col space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
                    Compra de Oro Profesional
                </h1>
                <p className="text-muted-foreground">
                    Gestione la adquisición de material con precisión financiera y auditoría.
                </p>
            </div>

            <GoldPurchaseForm />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">Últimas Transacciones</CardTitle>
                        </div>
                        <CardDescription>Historial de compras recientes procesadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history && history.length > 0 ? (
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted text-left font-medium text-muted-foreground">
                                            <th className="h-10 px-2">Fecha</th>
                                            <th className="h-10 px-2">Cliente</th>
                                            <th className="h-10 px-2 text-right">Peso (g)</th>
                                            <th className="h-10 px-2 text-right">Pureza</th>
                                            <th className="h-10 px-2 text-right">Total a Pagar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {history.map((purchase: any) => {
                                            return (
                                                <tr key={purchase.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="p-2 align-middle">
                                                        {format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                                    </td>
                                                    <td className="p-2 align-middle font-medium">
                                                        {purchase.customer?.fullName || "Cliente Desconocido"}
                                                    </td>
                                                    <td className="p-2 align-middle text-right font-mono">
                                                        {purchase.grossWeightGrams.toFixed(3)}g
                                                    </td>
                                                    <td className="p-2 align-middle text-right">
                                                        {purchase.purityPercent.toFixed(2)}%
                                                    </td>
                                                    <td className="p-2 align-middle text-right font-bold text-green-600">
                                                        ${purchase.finalPaidAmount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg">
                                <Info className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No se han registrado compras aún.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
