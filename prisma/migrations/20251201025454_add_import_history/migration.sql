-- AlterTable
ALTER TABLE `systemsettings` ADD COLUMN `workflow` VARCHAR(191) NOT NULL DEFAULT 'dispatcher-cashier';

-- CreateTable
CREATE TABLE `ImportHistory` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `importedBy` VARCHAR(191) NOT NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mode` VARCHAR(191) NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `successfulRows` INTEGER NOT NULL,
    `failedRows` INTEGER NOT NULL,
    `productsCreated` INTEGER NOT NULL DEFAULT 0,
    `productsUpdated` INTEGER NOT NULL DEFAULT 0,
    `inventoryItemsCreated` INTEGER NOT NULL DEFAULT 0,
    `errors` JSON NULL,
    `summary` JSON NULL,

    INDEX `ImportHistory_importedBy_idx`(`importedBy`),
    INDEX `ImportHistory_importedAt_idx`(`importedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportHistory` ADD CONSTRAINT `ImportHistory_importedBy_fkey` FOREIGN KEY (`importedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
