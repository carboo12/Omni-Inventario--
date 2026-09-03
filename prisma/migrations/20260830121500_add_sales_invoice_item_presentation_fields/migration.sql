-- AlterTable
ALTER TABLE `salesinvoiceitem` ADD COLUMN `presentationName` VARCHAR(191) NULL,
    ADD COLUMN `presentationFactor` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `baseUnit` VARCHAR(191) NULL,
    ADD COLUMN `bulkUnit` VARCHAR(191) NULL,
    ADD COLUMN `isEncargo` BOOLEAN NOT NULL DEFAULT 0;
