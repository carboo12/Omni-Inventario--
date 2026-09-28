-- AlterTable: días límite de crédito por defecto (ajuste global de CxC)
ALTER TABLE `systemsettings` ADD COLUMN `defaultCreditDays` INTEGER NOT NULL DEFAULT 30;

-- AlterTable: plazo de crédito individual por cliente (prevalece sobre el global)
-- NULL = usar el valor global de systemsettings.defaultCreditDays
ALTER TABLE `customer` ADD COLUMN `creditDays` INTEGER NULL;

-- AlterTable: fecha de vencimiento de la factura (solo ventas al crédito)
ALTER TABLE `salesinvoice` ADD COLUMN `dueDate` DATETIME(3) NULL;
