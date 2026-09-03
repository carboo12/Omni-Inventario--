-- Add code column to JewelryPiece if it doesn't exist
ALTER TABLE `JewelryPiece` ADD COLUMN IF NOT EXISTS `code` VARCHAR(191) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `JewelryPiece_code_key` ON `JewelryPiece`(`code`);
