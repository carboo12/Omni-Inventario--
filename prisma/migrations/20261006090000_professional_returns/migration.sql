-- Allow multiple partial return notes for one sales invoice.
-- Keep the existing unique index for referential integrity on MySQL. Partial
-- returns remain supported through ReturnItem records; invoice-level uniqueness
-- limits this schema to one aggregate credit note per invoice.

CREATE TABLE `returnitem` (
  `id` VARCHAR(191) NOT NULL,
  `returnId` VARCHAR(191) NOT NULL,
  `invoiceItemId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `productName` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `unitPrice` DOUBLE NOT NULL,
  `totalPrice` DOUBLE NOT NULL,
  `disposition` VARCHAR(191) NOT NULL DEFAULT 'RESTOCK',
  INDEX `returnitem_returnId_idx`(`returnId`),
  INDEX `returnitem_invoiceItemId_idx`(`invoiceItemId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `returnitem_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `creditnote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
