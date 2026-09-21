-- Módulo Opcional de Recetas (BOM):
--   - product.type: STANDARD (reventa normal) | INGREDIENT (materia prima) | RECIPE_ITEM (platillo preparado).
--   - RecipeItem: tabla relacional platillo <-> insumo (cantidad y unidad por cada platillo).

-- AlterTable: Product.type
ALTER TABLE `product` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'STANDARD';

-- CreateTable: recipeitem
CREATE TABLE `recipeitem` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NULL,

    INDEX `RecipeItem_productId_fkey`(`productId`),
    INDEX `RecipeItem_ingredientId_fkey`(`ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recipeitem` ADD CONSTRAINT `RecipeItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeitem` ADD CONSTRAINT `RecipeItem_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Todos los productos existentes quedan como STANDARD (default), sin alterar su comportamiento.