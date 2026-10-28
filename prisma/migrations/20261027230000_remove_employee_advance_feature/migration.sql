-- Los anticipos dejan de ser una categoría aparte: sus saldos siguen siendo
-- préstamos amortizables y los importes históricos de nómina se consolidan.
UPDATE `employeeloan`
SET `description` = CASE
  WHEN CHAR_LENGTH(TRIM(SUBSTRING(`description`, 11))) > 0
    THEN TRIM(SUBSTRING(`description`, 11))
  ELSE 'Préstamo registrado anteriormente'
END
WHERE `description` LIKE '[ANTICIPO]%';

-- Algunas instalaciones recibieron esta columna mediante db push y otras no.
-- Transferir su historial antes de borrarla, solo cuando la columna exista.
SET @has_advance_deductions = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payrollrecord'
    AND COLUMN_NAME = 'advanceDeductions'
);
SET @merge_advance_deductions_sql = IF(
  @has_advance_deductions > 0,
  'UPDATE `payrollrecord` SET `loanDeductions` = `loanDeductions` + COALESCE(`advanceDeductions`, 0)',
  'SELECT 1'
);
PREPARE merge_advance_deductions_stmt FROM @merge_advance_deductions_sql;
EXECUTE merge_advance_deductions_stmt;
DEALLOCATE PREPARE merge_advance_deductions_stmt;

SET @drop_advance_deductions_sql = IF(
  @has_advance_deductions > 0,
  'ALTER TABLE `payrollrecord` DROP COLUMN `advanceDeductions`',
  'SELECT 1'
);
PREPARE drop_advance_deductions_stmt FROM @drop_advance_deductions_sql;
EXECUTE drop_advance_deductions_stmt;
DEALLOCATE PREPARE drop_advance_deductions_stmt;

ALTER TABLE `employeeloan`
  DROP INDEX `employeeloan_employeeId_kind_status_idx`,
  DROP COLUMN `kind`;
