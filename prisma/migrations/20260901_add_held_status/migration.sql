-- AlterTable: Add HELD status to held_sale.status enum
ALTER TABLE `held_sale` MODIFY `status` ENUM('PENDING','HELD','BILLED','CANCELLED') NOT NULL DEFAULT 'PENDING';