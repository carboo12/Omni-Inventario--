-- AlterTable: descripciones adicionales de producto
ALTER TABLE `product` ADD COLUMN `hasExtraDetails` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `description2` VARCHAR(191) NULL,
    ADD COLUMN `description3` VARCHAR(191) NULL;

-- AlterTable: financiamiento de crédito por cuotas
ALTER TABLE `systemsettings` ADD COLUMN `creditFinancingEnabled` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `creditinstallment` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditInstallment_saleId_fkey`(`saleId`),
    INDEX `CreditInstallment_customerId_fkey`(`customerId`),
    INDEX `CreditInstallment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `creditinstallment` ADD CONSTRAINT `CreditInstallment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `salesinvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creditinstallment` ADD CONSTRAINT `CreditInstallment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;