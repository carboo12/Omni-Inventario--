-- AlterTable: ciclo de liquidación de pedidos para ruta (cobro contra entrega)
-- NULL en ventas de mostrador.
-- PENDIENTE_LIQUIDACION | LIQUIDADO_Y_PAGADO | LIQUIDADO_CON_DEVOLUCION_PARCIAL | RECHAZADO_EN_RUTA
ALTER TABLE `salesinvoice` ADD COLUMN `routeStatus` VARCHAR(191) NULL;

CREATE INDEX `SalesInvoice_routeStatus_idx` ON `salesinvoice`(`routeStatus`);

-- AlterTable: bodega desde la que se descontó el stock del pedido.
-- Se conserva para que una devolución en ruta reponga exactamente la misma bodega.
ALTER TABLE `salesinvoice` ADD COLUMN `inventoryType` VARCHAR(191) NULL;

-- CreateTable: liquidación de caja del pedido en ruta (una por factura)
CREATE TABLE `routesettlement` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `outcome` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `collectedAmount` DOUBLE NOT NULL DEFAULT 0,
    `returnedAmount` DOUBLE NOT NULL DEFAULT 0,
    `returnedUnits` INT NOT NULL DEFAULT 0,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `settledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RouteSettlement_invoiceId_fkey`(`invoiceId`),
    INDEX `RouteSettlement_sessionId_fkey`(`sessionId`),
    INDEX `RouteSettlement_settledAt_idx`(`settledAt`),
    UNIQUE INDEX `RouteSettlement_invoiceId_key`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: detalle de unidades devueltas en la liquidación de ruta
CREATE TABLE `rutereturnitem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `invoiceItemId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` INT NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RouteReturnItem_invoiceId_fkey`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `routesettlement` ADD CONSTRAINT `RouteSettlement_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `salesinvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rutereturnitem` ADD CONSTRAINT `RouteReturnItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `salesinvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
