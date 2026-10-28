ALTER TABLE `employeeloan`
  ADD COLUMN `remainingBalance` DECIMAL(12,2) NULL;

UPDATE `employeeloan`
SET `remainingBalance` = CASE
  WHEN `status` = 'PENDING' THEN `amount`
  ELSE 0
END;
