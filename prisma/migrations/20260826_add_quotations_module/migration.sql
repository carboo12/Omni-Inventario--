-- CreateEnum: QuoteStatus
CREATE TABLE `quote_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` ENUM('PENDING', 'CONVERTED', 'EXPIRED', 'CANCELLED') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Quote
CREATE TABLE `quote` (
    `id` VARCHAR(191) NOT NULL,
    `quoteNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `customerName` VARCHAR(191) NOT NULL DEFAULT 'Cliente General',
    `customerPhone` VARCHAR(191) NULL,
    `expirationDays` INTEGER NOT NULL DEFAULT 30,
    `subtotal` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `convertedInvoiceId` VARCHAR(191) NULL,

    UNIQUE INDEX `quote_quoteNumber_key`(`quoteNumber`),
    INDEX `quote_userId_idx`(`userId`),
    INDEX `quote_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: QuoteItem
CREATE TABLE `quote_item` (
    `id` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `variantId` VARCHAR(191) NULL,

    INDEX `quote_item_quoteId_idx`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Quote -> User
ALTER TABLE `quote` ADD CONSTRAINT `quote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: QuoteItem -> Quote
ALTER TABLE `quote_item` ADD CONSTRAINT `quote_item_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: QuoteItem -> Product
ALTER TABLE `quote_item` ADD CONSTRAINT `quote_item_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
