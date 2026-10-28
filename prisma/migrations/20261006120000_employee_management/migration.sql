CREATE TABLE `employee` (
  `id` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `dailySalary` DECIMAL(12,2) NOT NULL,
  `payFrequency` ENUM('WEEKLY','BIWEEKLY') NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  INDEX `employee_fullName_idx`(`fullName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employeeloan` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `description` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','DEDUCTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `cashMovementId` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `employeeloan_cashMovementId_key`(`cashMovementId`),
  INDEX `employeeloan_employeeId_status_idx`(`employeeId`, `status`),
  CONSTRAINT `employeeloan_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `employeeloan_cashMovementId_fkey` FOREIGN KEY (`cashMovementId`) REFERENCES `cashoutflow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employeeabsence` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `reason` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `employeeabsence_employeeId_date_idx`(`employeeId`, `date`),
  CONSTRAINT `employeeabsence_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payrollrecord` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `grossSalary` DECIMAL(12,2) NOT NULL,
  `absenceDeductions` DECIMAL(12,2) NOT NULL,
  `loanDeductions` DECIMAL(12,2) NOT NULL,
  `netSalary` DECIMAL(12,2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `payrollrecord_employeeId_startDate_endDate_idx`(`employeeId`, `startDate`, `endDate`),
  CONSTRAINT `payrollrecord_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
