-- AlterTable: Add lockedBy column to held_sale
ALTER TABLE `held_sale` ADD COLUMN `lockedBy` VARCHAR(191) NULL;

-- CreateIndex: Add index for lockedBy queries
CREATE INDEX `held_sale_lockedBy_idx` ON `held_sale`(`lockedBy`);
