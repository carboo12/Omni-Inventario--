-- AlterTable: vínculo de cotizaciones con ficha de cliente guardada
ALTER TABLE `quote` ADD COLUMN `clientId` VARCHAR(191) NULL;

-- AddForeignKey: Quote -> Customer
ALTER TABLE `quote` ADD CONSTRAINT `quote_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX `quote_clientId_idx` ON `quote`(`clientId`);