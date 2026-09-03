import { Prisma } from "@prisma/client";

/**
 * FinancialService
 * Centralized service for tracking income and expenses.
 */
export class FinancialService {
    /**
     * Records a financial transaction.
     * MUST be called within an existing Prisma transaction.
     */
    public static async record(
        tx: Prisma.TransactionClient,
        data: {
            type: "EXPENSE" | "INCOME";
            amount: number;
            referenceId: string;
            description: string;
        }
    ) {
        return await tx.financialTransaction.create({
            data: {
                type: data.type,
                amount: data.amount,
                referenceId: data.referenceId,
                description: data.description,
            },
        });
    }
}
