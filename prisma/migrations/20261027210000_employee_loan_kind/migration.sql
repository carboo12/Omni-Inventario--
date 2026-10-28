ALTER TABLE `employeeloan`
  ADD COLUMN `kind` ENUM('LOAN', 'ADVANCE') NOT NULL DEFAULT 'LOAN';

UPDATE `employeeloan`
SET `kind` = 'ADVANCE'
WHERE `description` LIKE '[ANTICIPO]%';

CREATE INDEX `employeeloan_employeeId_kind_status_idx`
  ON `employeeloan`(`employeeId`, `kind`, `status`);
