-- AlterTable
ALTER TABLE `cashregistersession` ADD COLUMN `actualUSD` DOUBLE NULL,
    ADD COLUMN `totalReturns` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `systemsettings` ADD COLUMN `allowCard` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allowCash` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allowDollars` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `blockInsufficientCash` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `exchangeRate` VARCHAR(191) NOT NULL DEFAULT '36.5',
    ADD COLUMN `isPremium` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `logoSvg` TEXT NULL;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `inventoryType` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_inventoryType_idx`(`inventoryType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashOutflow` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `receiptNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CashOutflow_receiptNumber_key`(`receiptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalAmount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SalesInvoice_invoiceNumber_key`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesInvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNote` (
    `id` VARCHAR(191) NOT NULL,
    `noteNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` VARCHAR(191) NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CreditNote_noteNumber_key`(`noteNumber`),
    UNIQUE INDEX `CreditNote_invoiceId_key`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `CashOutflow` ADD CONSTRAINT `CashOutflow_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `CashRegisterSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `CashRegisterSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoiceItem` ADD CONSTRAINT `SalesInvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SalesInvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SalesInvoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `CashRegisterSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
