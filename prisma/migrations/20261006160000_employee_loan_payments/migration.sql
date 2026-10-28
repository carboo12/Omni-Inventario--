CREATE TABLE `employeeloanpayment` (
  `id` VARCHAR(191) NOT NULL,
  `loanId` VARCHAR(191) NOT NULL,
  `payrollRecordId` VARCHAR(191) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `kind` ENUM('PAYROLL','CASH') NOT NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `employeeloanpayment_loanId_createdAt_idx`(`loanId`, `createdAt`),
  INDEX `employeeloanpayment_payrollRecordId_idx`(`payrollRecordId`),
  CONSTRAINT `employeeloanpayment_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `employeeloan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `employeeloanpayment_payrollRecordId_fkey` FOREIGN KEY (`payrollRecordId`) REFERENCES `payrollrecord`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
