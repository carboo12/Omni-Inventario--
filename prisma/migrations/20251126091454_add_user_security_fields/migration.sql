-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `inventoryType` VARCHAR(191) NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceNIO` DOUBLE NOT NULL,
    `costPriceNIO` DOUBLE NULL,
    `category` VARCHAR(191) NOT NULL,
    `inventoryType` VARCHAR(191) NOT NULL,
    `unitOfMeasure` VARCHAR(191) NOT NULL,
    `minStock` INTEGER NULL,
    `barcode` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `imageHint` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `inventoryType` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `batch` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `expiryDate` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `movementType` VARCHAR(191) NOT NULL,
    `movementId` VARCHAR(191) NOT NULL,
    `quantityChange` INTEGER NOT NULL,
    `previousQuantity` INTEGER NOT NULL,
    `newQuantity` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `inventoryType` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `dueDate` VARCHAR(191) NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `paidAmount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashRegisterSession` (
    `id` VARCHAR(191) NOT NULL,
    `cashierId` VARCHAR(191) NOT NULL,
    `cashierName` VARCHAR(191) NOT NULL,
    `openingTime` VARCHAR(191) NOT NULL,
    `closingTime` VARCHAR(191) NULL,
    `initialAmount` DOUBLE NOT NULL,
    `finalAmount` DOUBLE NULL,
    `totalSales` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` VARCHAR(191) NOT NULL,
    `pharmacyName` VARCHAR(191) NOT NULL DEFAULT 'PharmaSync',
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NIO',
    `taxRate` DOUBLE NOT NULL DEFAULT 0.15,
    `applyTax` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseInvoice` ADD CONSTRAINT `PurchaseInvoice_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashRegisterSession` ADD CONSTRAINT `CashRegisterSession_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
