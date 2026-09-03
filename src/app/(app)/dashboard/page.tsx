
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, AlertTriangle, Coins, CreditCard, Landmark, Loader2, ShieldCheck, Truck, MapPin, Users, Boxes } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, DashboardStats } from "@/lib/actions/dashboard";
import { useBusinessMode } from "@/hooks/use-business-mode";
import { formatNumber } from "@/lib/utils";

const EXCHANGE_RATE = 36.5;

export default function DashboardPage() {
  const { user } = useAuth();
  const { mode } = useBusinessMode();

  const effectiveInventoryType = mode === 'JEWELRY' ? 'jewelry' : mode === 'DISTRIBUIDORA' ? 'general' : (user?.inventoryType || 'pharmacy');

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard-stats', user?.role ?? '', effectiveInventoryType, user?.id ?? ''],
    queryFn: async () => {
      try {
        return await getDashboardStats(user!.role, effectiveInventoryType as any, user!.id);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const renderDashboardContent = () => {
    if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!stats) return null;

    const masterAdminStats = [
      { title: "Total de Productos / Ítems", value: `${formatNumber(stats.totalProducts, 0)} ítems`, icon: Boxes, change: "Productos registrados en el catálogo" },
      { title: "Ingresos Totales", value: `C$${formatNumber(stats.totalRevenue)}`, icon: DollarSign, change: "Total acumulado" },
      // "Sucursales Totales" removed as requested
      { title: "Inventario General", value: `${formatNumber(stats.totalInventoryCount, 0)} unidades`, icon: Package, change: "Total en todas las bodegas" },
      { title: "Aprobaciones Pendientes", value: stats.pendingApprovals.toString(), icon: AlertTriangle, change: stats.pendingApprovals > 0 ? "Requiere atención" : "Todo al día" },
      { title: "Estado de Licencia", value: "Activa", icon: ShieldCheck, change: "Sistema validado" },
    ];

    const adminStats = [
      { title: "Total de Productos / Ítems", value: `${formatNumber(stats.totalProducts, 0)} ítems`, icon: Boxes, change: "Productos registrados en el catálogo" },
      { title: "Ingresos de Sucursal", value: `C$${formatNumber(stats.totalRevenue)}`, icon: DollarSign, change: "Total acumulado" },
      { title: "Inversión en Inventario", value: `C$${formatNumber(stats.inventoryInvestment)}`, icon: Landmark, change: "Valor de costo del stock" },
      { title: "Cuentas por Pagar", value: `C$${formatNumber(stats.accountsPayable)}`, icon: CreditCard, change: "Saldo total pendiente" },
      { title: "Productos a Vencer", value: stats.expiringProductsCount.toString(), icon: AlertTriangle, change: "En los próximos 30 días" },
    ];

    const dispatcherStats = [
      { title: "Inversión en Inventario", value: `C$${formatNumber(stats.inventoryInvestment)}`, icon: Landmark, change: `Valor de costo (${user?.inventoryType === 'pharmacy' ? 'Farmacia' : 'General'})` },
      { title: "Artículos con Stock Bajo", value: stats.lowStockCount.toString(), icon: Package, change: "Necesitan reabastecimiento" },
      { title: "Productos a Vencer", value: stats.expiringProductsCount.toString(), icon: AlertTriangle, change: "En los próximos 30 días" },
      { title: "Movimientos de Stock Hoy", value: (stats.stockMovementsToday || 0).toString(), icon: Package, change: "Entradas, salidas y ajustes" },
    ];

    const cashierStats = [
      { title: "Ventas de Hoy", value: `C$${formatNumber(stats.todaysSalesAmount)}`, icon: DollarSign, change: "Total del día" },
      { title: "Ventas del Turno", value: `C$${formatNumber(stats.todaysSalesAmount)}`, icon: ShoppingCart, change: "Sesión actual" },
      { title: "Caja (C$)", value: `C$${formatNumber(stats.cashInRegister)}`, icon: Coins, change: "Efectivo estimado" },
      { title: "Caja ($)", value: `$${formatNumber(stats.cashInRegister / EXCHANGE_RATE)}`, icon: DollarSign, change: `TC: ${EXCHANGE_RATE}` },
    ];

    const ruteroStats = [
      { title: "Entregas de Hoy", value: "0", icon: Truck, change: "Pendientes de asignación" },
      { title: "Ruta Asignada", value: "Sin ruta", icon: MapPin, change: "No hay ruta activa" },
      { title: "Clientes a Visitar", value: "0", icon: Users, change: "En la ruta actual" },
      { title: "Pendientes de Ayer", value: "0", icon: AlertTriangle, change: "Entregas no completadas" },
    ];

    let currentStats: { title: string; value: string | number; icon: React.ElementType; change: string; }[] = [];

    if (mode === 'DISTRIBUIDORA') {
      currentStats = [
        { title: "Ventas de Hoy", value: `C$${formatNumber(stats.todaysSalesAmount)}`, icon: DollarSign, change: "Total del día" },
        { title: "Inventario General", value: `${formatNumber(stats.totalInventoryCount, 0)} unidades`, icon: Package, change: "Total en bodega" },
        { title: "Cuentas por Cobrar", value: `C$${formatNumber(stats.accountsReceivable)}`, icon: CreditCard, change: "Saldo pendiente de clientes" },
        { title: "Productos Stock Bajo", value: stats.lowStockCount.toString(), icon: AlertTriangle, change: "Necesitan reabastecimiento" },
      ];
    } else if (mode === 'JEWELRY' && stats.jewelryStats && (user?.role === 'master-admin' || user?.role === 'admin')) {
      const jStats = stats.jewelryStats;
      const totalGrams = jStats.gramsByKarat.reduce((acc, curr) => acc + curr.grams, 0);

      currentStats = [
        {
          title: "Precio Oro (oz)",
          value: `$${formatNumber(jStats.currentMarketPrice)}`,
          icon: DollarSign,
          change: `≈ C$${formatNumber(jStats.currentMarketPrice * EXCHANGE_RATE)} — Mercado Actual`
        },
        {
          title: "Peso Total en Stock",
          value: `${totalGrams.toFixed(2)}g`,
          icon: Landmark,
          change: "Oro fino en inventario"
        },
        {
          title: "Valor de Inventario",
          value: `C$${formatNumber(jStats.totalInventoryValueUSD * EXCHANGE_RATE)}`,
          icon: ShoppingCart,
          change: `≈ $${formatNumber(jStats.totalInventoryValueUSD)} USD`
        },
        {
          title: "Utilidad Estimada",
          value: `C$${formatNumber(jStats.estimatedProfitUSD * EXCHANGE_RATE)}`,
          icon: AlertTriangle,
          change: `≈ $${formatNumber(jStats.estimatedProfitUSD)} USD — ${jStats.estimatedProfitUSD >= 0 ? 'Balance positivo' : 'Balance negativo'}`
        }
      ];
    } else {
      if (user?.role === 'master-admin') currentStats = masterAdminStats;
      if (user?.role === 'admin') currentStats = adminStats;
      if (user?.role === 'dispatcher') currentStats = dispatcherStats;
      if (user?.role === 'cashier') currentStats = cashierStats;
      if (user?.role === 'rutero') currentStats = ruteroStats;
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {currentStats.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{stat.title}</CardTitle>
                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
              </div>
              <div className="metric-icon">
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="border-t pt-3 text-xs font-medium text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="surface-panel rounded-lg p-5 md:p-6">
        <h1 className="text-2xl font-headline font-bold tracking-tight md:text-3xl">
          ¡Bienvenido de nuevo, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Aquí tienes un vistazo a tu panel de control para hoy.
        </p>
      </div>
      {renderDashboardContent()}

      {stats && stats.openSessions && stats.openSessions.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Cierre de Caja Pendiente</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>Las siguientes cajas no han realizado el cierre:</p>
                <ul className="mt-1 list-disc pl-5">
                  {stats.openSessions.map((session: any) => (
                    <li key={session.id}>
                      {session.cashierName || 'Cajero Desconocido'} - Abierto desde: {new Date(session.openingTime).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Un registro de eventos y actividades recientes.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.movementType} por {activity.user?.name || 'Sistema'}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${activity.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.quantityChange > 0 ? '+' : ''}{activity.quantityChange}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
