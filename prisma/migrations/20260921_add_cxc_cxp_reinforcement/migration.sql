-- AlterTable: SalesInvoice.pendingBalance (saldo pendiente por factura de crédito)
ALTER TABLE `salesinvoice` ADD COLUMN `pendingBalance` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable: CreditPayment.invoiceId (vínculo del abono con la factura a la que se aplicó)
ALTER TABLE `creditpayment` ADD COLUMN `invoiceId` VARCHAR(191) NULL;

CREATE INDEX `CreditPayment_invoiceId_fkey` ON `creditpayment`(`invoiceId`);

-- AddForeignKey
ALTER TABLE `creditpayment` ADD CONSTRAINT `CreditPayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `salesinvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: CashRegisterSession.salesAbonosCard (abonos de crédito por tarjeta/transferencia)
ALTER TABLE `cashregistersession` ADD COLUMN `salesAbonosCard` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable: supplierpayment (historial de pagos a proveedores / CxP)
CREATE TABLE `supplierpayment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupplierPayment_invoiceId_fkey`(`invoiceId`),
    INDEX `SupplierPayment_supplierId_fkey`(`supplierId`),
    INDEX `SupplierPayment_sessionId_fkey`(`sessionId`),
    INDEX `SupplierPayment_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplierpayment` ADD CONSTRAINT `SupplierPayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `purchaseinvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplierpayment` ADD CONSTRAINT `SupplierPayment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplierpayment` ADD CONSTRAINT `SupplierPayment_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `cashregistersession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplierpayment` ADD CONSTRAINT `SupplierPayment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill 1: facturas de crédito CON financiamiento -> pendingBalance = suma de cuotas (total financiado con interés).
UPDATE `salesinvoice` si
JOIN (SELECT `saleId`, SUM(`amount`) AS `financed` FROM `creditinstallment` GROUP BY `saleId`) ci ON ci.`saleId` = si.`id`
SET si.`pendingBalance` = ci.`financed`
WHERE si.`status` = 'COMPLETED' AND si.`pendingBalance` = 0;

-- Backfill 2: facturas de crédito SIN financiamiento -> pendingBalance = totalAmount.
UPDATE `salesinvoice` si
LEFT JOIN (SELECT `saleId`, SUM(`amount`) AS `financed` FROM `creditinstallment` GROUP BY `saleId`) ci ON ci.`saleId` = si.`id`
SET si.`pendingBalance` = si.`totalAmount`
WHERE si.`status` = 'COMPLETED'
  AND si.`pendingBalance` = 0
  AND ci.`financed` IS NULL
  AND (UPPER(si.`paymentMethod`) LIKE '%CREDIT%' OR UPPER(si.`paymentMethod`) LIKE '%FIADO%');