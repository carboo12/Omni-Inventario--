import { getSalesData, getTopProducts, getLowStockInventory, getExpiringProducts, getCreditPerformanceData, getPriceLevelAnalysis } from "@/lib/actions/reports";
import { getJewelryInventoryStats, getJewelrySalesStats, getJewelryDetailedInventory, getJewelryTopSellingPieces } from "@/lib/actions/jewelry-reports";
import { getSettings } from "@/lib/actions/settings";
import ReportsClient from "./client";

export default async function ReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    const params = await searchParams;
    const startDate = params.from ? new Date(params.from) : undefined;
    const endDate = params.to ? new Date(params.to) : undefined;

    const [systemSettings] = await Promise.all([
        getSettings(),
    ]);
    const isJewelry = systemSettings.businessMode === 'JEWELRY';

    const exchangeRate = parseFloat(systemSettings.exchangeRate || "36.5");

    if (isJewelry) {
        const [inventoryStats, salesStats, topSelling, detailedInventory] = await Promise.all([
            getJewelryInventoryStats(),
            getJewelrySalesStats(startDate, endDate),
            getJewelryTopSellingPieces(startDate, endDate),
            getJewelryDetailedInventory(),
        ]);

        return (
            <ReportsClient
                isJewelry={true}
                exchangeRate={exchangeRate}
                jewelryData={{
                    inventoryStats: inventoryStats.data || [],
                    salesStats: salesStats.success ? {
                        chartData: salesStats.chartData!,
                        materialData: salesStats.materialData!,
                        totalRevenue: salesStats.totalRevenue!,
                        totalCount: salesStats.totalCount!,
                    } : { chartData: [], materialData: [], totalRevenue: 0, totalCount: 0 },
                    topSelling: topSelling.data || [],
                    detailedInventory: detailedInventory.data || []
                }}
            />
        );
    }

    const [salesData, topProducts, lowStockInventory, expiringProducts, creditData, priceLevelData] = await Promise.all([
        getSalesData(startDate, endDate),
        getTopProducts(startDate, endDate),
        getLowStockInventory(),
        getExpiringProducts(),
        getCreditPerformanceData(startDate, endDate),
        getPriceLevelAnalysis(startDate, endDate),
    ]);

    return (
        <ReportsClient
            isJewelry={false}
            salesData={salesData}
            topProducts={topProducts}
            lowStockInventory={lowStockInventory}
            expiringProducts={expiringProducts}
            creditData={creditData}
            priceLevelData={priceLevelData}
            exchangeRate={exchangeRate}
        />
    );
}
