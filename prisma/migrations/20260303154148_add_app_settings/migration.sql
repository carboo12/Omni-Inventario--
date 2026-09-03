-- AlterTable
ALTER TABLE `salesinvoice` ADD COLUMN `customerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AppSettings` (
    `id` VARCHAR(191) NOT NULL,
    `businessMode` ENUM('PHARMACY', 'JEWELRY') NOT NULL DEFAULT 'PHARMACY',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoldPurchase` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `grossWeight` DOUBLE NOT NULL,
    `karat` INTEGER NOT NULL,
    `pureGoldWeight` DOUBLE NOT NULL,
    `marketPrice` DOUBLE NOT NULL,
    `pricePerGram` DOUBLE NOT NULL,
    `totalPaid` DOUBLE NOT NULL,
    `status` ENUM('IN_STOCK', 'MELTED', 'TRANSFORMED') NOT NULL DEFAULT 'IN_STOCK',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoldStock` (
    `id` VARCHAR(191) NOT NULL,
    `karat` INTEGER NOT NULL,
    `gramsAvailable` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GoldStock_karat_key`(`karat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JewelryPiece` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `karat` INTEGER NOT NULL,
    `laborCost` DOUBLE NOT NULL,
    `margin` DOUBLE NOT NULL,
    `calculatedPrice` DOUBLE NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `status` ENUM('AVAILABLE', 'SOLD', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepairOrder` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `receivedWeight` DOUBLE NULL,
    `advancePayment` DOUBLE NOT NULL,
    `estimatedDeliveryDate` DATETIME(3) NOT NULL,
    `finalPrice` DOUBLE NULL,
    `status` ENUM('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED') NOT NULL DEFAULT 'RECEIVED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Layaway` (
    `id` VARCHAR(191) NOT NULL,
    `jewelryPieceId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `downPayment` DOUBLE NOT NULL,
    `remainingAmount` DOUBLE NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoldPurchase` ADD CONSTRAINT `GoldPurchase_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepairOrder` ADD CONSTRAINT `RepairOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Layaway` ADD CONSTRAINT `Layaway_jewelryPieceId_fkey` FOREIGN KEY (`jewelryPieceId`) REFERENCES `JewelryPiece`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Layaway` ADD CONSTRAINT `Layaway_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
