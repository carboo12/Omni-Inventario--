-- Política de stock en ventas (POS):
--   - allowNegativeStock = FALSE (por defecto): la venta se bloquea si no hay
--     existencias suficientes, de modo que el inventario nunca queda negativo.
--   - allowNegativeStock = TRUE: el producto puede venderse "bajo encargo"
--     (entrega pendiente), y el kardex acepta saldos negativos.
ALTER TABLE `product` ADD COLUMN `allowNegativeStock` BOOLEAN NOT NULL DEFAULT false;
