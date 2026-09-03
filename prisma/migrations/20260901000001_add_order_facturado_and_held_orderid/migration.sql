-- AlterEnum: add FACTURADO to customer_order_status (MySQL enum on customer_order.status)
ALTER TABLE `customer_order` MODIFY `status` ENUM('PENDING','APPROVED','IN_TRANSIT','DELIVERED','FACTURADO','CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable: Add orderId column to held_sale (referencia del pedido origen)
ALTER TABLE `held_sale` ADD COLUMN `orderId` VARCHAR(191) NULL;

-- CreateIndex: index for orderId queries
CREATE INDEX `held_sale_orderId_idx` ON `held_sale`(`orderId`);
