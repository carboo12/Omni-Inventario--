import { Prisma } from "@prisma/client";
import { FinancialService } from "./financial-service";

/**
 * JewelrySalesService
 * Handles the point-of-sale logic for finished jewelry pieces.
 */
export class JewelrySalesService {
    /**
     * Finalizes the sale of a jewelry piece.
     */
    public static async sell(
        tx: Prisma.TransactionClient,
        data: {
            pieceId: string;
            customerId: string;
            salePrice: number;
            paymentMethod: string;
            userId: string;
            sessionId?: string | null;
        }
    ) {
        // 1. Fetch and Validate Piece
        const piece = await tx.jewelryPiece.findUnique({
            where: { id: data.pieceId },
        });

        if (!piece || piece.status !== "AVAILABLE") {
            throw new Error("La pieza no está disponible para la venta.");
        }

        // 2. Update Piece Status
        const updatedPiece = await tx.jewelryPiece.update({
            where: { id: data.pieceId },
            data: { status: "SOLD" },
        });

        // 3. Record Financial Income
        await FinancialService.record(tx, {
            type: "INCOME",
            amount: data.salePrice,
            referenceId: piece.id,
            description: `Venta de pieza: ${piece.name} a cliente ID: ${data.customerId}`,
        });

        // 4. Update Cash Register Session if one is active
        if (!data.sessionId) {
            throw new Error("Se requiere una sesión de caja activa para procesar la venta.");
        }

        const settings = await tx.systemSettings.findFirst();
        const exchangeRate = parseFloat(settings?.exchangeRate || "36.5");
        const amountInNio = Math.round(data.salePrice * exchangeRate * 100) / 100;

        const updateData: Prisma.CashRegisterSessionUpdateInput = {
            totalSales: { increment: amountInNio },
        };

        const pm = data.paymentMethod.toLowerCase();
        if (pm === "efectivo $") {
            updateData.salesUSD = { increment: data.salePrice };
        } else if (pm === "efectivo c$") {
            updateData.salesCash = { increment: amountInNio };
        } else if (pm.includes('tarjeta')) {
            updateData.salesCard = { increment: amountInNio };
        } else {
            // Default to cash NIO for other methods like Transferencia
            updateData.salesCash = { increment: amountInNio };
        }

        await tx.cashRegisterSession.update({
            where: { id: data.sessionId },
            data: updateData,
        });

        // 5. Create SalesInvoice
        const invoice = await tx.salesInvoice.create({
            data: {
                totalAmount: amountInNio, // Guardar en NIO para reportes consistentes
                paymentMethod: data.paymentMethod,
                status: 'COMPLETED',
                sessionId: data.sessionId,
                userId: data.userId,
                customerId: data.customerId,
                items: {
                    create: [{
                        productId: piece.id,
                        productName: piece.name,
                        quantity: 1,
                        unitPrice: amountInNio,
                        totalPrice: amountInNio,
                        priceLevel: 0
                    }]
                }
            }
        });

        // 6. Audit Log
        await tx.auditLog.create({
            data: {
                userId: data.userId,
                action: "JEWELRY_SALE",
                entity: "JewelryPiece",
                entityId: piece.id,
            },
        });

        return { piece: updatedPiece, invoiceNumber: invoice.invoiceNumber };
    }

    /**
     * Finalizes the sale of multiple jewelry pieces.
     */
    public static async sellMultiple(
        tx: Prisma.TransactionClient,
        data: {
            cartItems: { pieceId: string, salePrice: number }[];
            customerId: string;
            totalSalePrice: number;
            paymentMethod: string;
            userId: string;
            sessionId?: string | null;
        }
    ) {
        if (data.cartItems.length === 0) {
            throw new Error("No hay piezas para facturar.");
        }

        const pieceIds = data.cartItems.map(item => item.pieceId);

        // 1. Fetch and Validate Pieces
        const pieces = await tx.jewelryPiece.findMany({
            where: { id: { in: pieceIds } },
        });

        if (pieces.length !== pieceIds.length) {
            throw new Error("Una o más piezas no fueron encontradas.");
        }

        const unavailablePieces = pieces.filter(p => p.status !== "AVAILABLE");
        if (unavailablePieces.length > 0) {
            throw new Error(`Las siguientes piezas no están disponibles: ${unavailablePieces.map(p => p.name).join(", ")}`);
        }

        // 2. Update Piece Status
        await tx.jewelryPiece.updateMany({
            where: { id: { in: pieceIds } },
            data: { status: "SOLD" },
        });

        // 3. Record Financial Income
        // We'll record a single financial movement for the entire sale
        await FinancialService.record(tx, {
            type: "INCOME",
            amount: data.totalSalePrice,
            referenceId: `MULTIPLE-${Date.now()}`,
            description: `Venta de ${pieces.length} piezas a cliente ID: ${data.customerId}`,
        });

        // 4. Update Cash Register Session if one is active
        if (!data.sessionId) {
            throw new Error("Se requiere una sesión de caja activa para procesar la venta.");
        }

        const settings = await tx.systemSettings.findFirst();
        const exchangeRate = parseFloat(settings?.exchangeRate || "36.5");
        const amountInNio = Math.round(data.totalSalePrice * exchangeRate * 100) / 100;

        const updateData: Prisma.CashRegisterSessionUpdateInput = {
            totalSales: { increment: amountInNio },
        };

        const pm = data.paymentMethod.toLowerCase();
        if (pm === "efectivo $") {
            updateData.salesUSD = { increment: data.totalSalePrice };
        } else if (pm === "efectivo c$") {
            updateData.salesCash = { increment: amountInNio };
        } else if (pm.includes('tarjeta')) {
            updateData.salesCard = { increment: amountInNio };
        } else {
            // Default to cash NIO for other methods like Transferencia
            updateData.salesCash = { increment: amountInNio };
        }

        await tx.cashRegisterSession.update({
            where: { id: data.sessionId },
            data: updateData,
        });

        const invoiceItems = pieces.map(piece => {
            const cartItem = data.cartItems.find(item => item.pieceId === piece.id);
            const itemPriceUSD = cartItem ? cartItem.salePrice : piece.calculatedPrice;
            const itemPriceNIO = Math.round(itemPriceUSD * exchangeRate * 100) / 100;
            return {
                productId: piece.id,
                productName: piece.name,
                quantity: 1,
                unitPrice: itemPriceNIO,
                totalPrice: itemPriceNIO,
                priceLevel: 0
            };
        });

        // 5. Create SalesInvoice
        const invoice = await tx.salesInvoice.create({
            data: {
                totalAmount: amountInNio, // Guardar en NIO
                paymentMethod: data.paymentMethod,
                status: 'COMPLETED',
                sessionId: data.sessionId,
                userId: data.userId,
                customerId: data.customerId,
                items: {
                    create: invoiceItems
                }
            }
        });

        // 6. Audit Log
        const auditLogs = pieces.map(piece => ({
            userId: data.userId,
            action: "JEWELRY_SALE",
            entity: "JewelryPiece",
            entityId: piece.id,
        }));
        await tx.auditLog.createMany({ data: auditLogs });

        return { pieces, invoiceNumber: invoice.invoiceNumber };
    }
}
