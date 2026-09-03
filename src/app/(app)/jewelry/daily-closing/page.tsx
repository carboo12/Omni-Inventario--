import { getTodayJewelrySalesDetail, getJewelrySessionSummary } from "@/lib/actions/jewelry-reports";
import DailyClosingClient from "./daily-closing-client";
import db from "@/lib/db";
import { redirect } from '@/lib/router-nav';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from '@/lib/router-nav';
import { BusinessGuard } from "@/lib/business-guard";

export default async function JewelryDailyClosingPage() {
    const mode = await BusinessGuard.getCurrentMode();
    if (mode !== 'JEWELRY') redirect('/dashboard');

    // 1. Get the current active session
    // In jewelry mode, we assume there's only one main active session or we fetch the most recent open one.
    const activeSession = await db.cashRegisterSession.findFirst({
        where: { status: 'open' },
        orderBy: { openingTime: 'desc' }
    });

    if (!activeSession) {
        return (
            <div className="container mx-auto p-12">
                <Alert className="max-w-2xl mx-auto border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="text-yellow-800 font-bold">Sin Caja Abierta</AlertTitle>
                    <AlertDescription className="text-yellow-700 mt-2">
                        No hay ninguna sesión de caja abierta en este momento. Para ver el cierre del día,
                        primero debe registrar alguna actividad o abrir una caja.
                    </AlertDescription>
                    <div className="mt-4 flex gap-3">
                        <Button asChild className="bg-[#8BC34A] hover:bg-[#7CB342] text-white">
                            <Link href="/cash-register/open">Abrir Caja</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/jewelry/sales">Ir a Ventas</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    // 2. Fetch details for this session — in parallel
    const [salesResult, summaryResult] = await Promise.all([
        getTodayJewelrySalesDetail(activeSession.id),
        getJewelrySessionSummary(activeSession.id),
    ]);

    if (!salesResult.success || !summaryResult.success) {
        return <div>Error al cargar los datos del reporte.</div>;
    }

    return (
        <div className="container mx-auto py-6">
            <DailyClosingClient
                sales={salesResult.data as any[]}
                summary={summaryResult.data as any}
                sessionId={activeSession.id}
            />
        </div>
    );
}
