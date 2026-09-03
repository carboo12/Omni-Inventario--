-- Ejecuta este SQL en tu base de datos MySQL para crear la tabla JewelryMaterial
-- que el esquema de Prisma requiere.

CREATE TABLE IF NOT EXISTS `JewelryMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `JewelryMaterial_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agrega la columna materialId a JewelryPiece si no existe:
ALTER TABLE `JewelryPiece` 
    ADD COLUMN IF NOT EXISTS `materialId` VARCHAR(191) NULL;

-- Agrega la clave foranea si no existe:
ALTER TABLE `JewelryPiece`
    ADD CONSTRAINT `JewelryPiece_materialId_fkey`
    FOREIGN KEY (`materialId`) REFERENCES `JewelryMaterial`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
