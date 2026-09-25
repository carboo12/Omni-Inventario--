-- Banderas opcionales por giro de negocio (CompanySettings versátil)
ALTER TABLE `systemsettings` ADD COLUMN `enableMultiCurrency` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `systemsettings` ADD COLUMN `enableWholesalePrices` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `systemsettings` ADD COLUMN `enableAccountsPayable` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `systemsettings` ADD COLUMN `enablePettyCashExpenses` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `systemsettings` ADD COLUMN `enableSerialNumbers` BOOLEAN NOT NULL DEFAULT false;