'use server';

import { verifySession } from '../session';
import db from '../db';
import { generateUUID } from '../uuid';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await verifySession();
  if (!session || !['master-admin', 'admin'].includes(session.role)) throw new Error('No autorizado.');
  return session;
}

function parseDate(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Fecha inválida.');
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha inválida.');
  return date;
}

function countWorkdays(start: Date, end: Date) {
  let count = 0;
  const day = new Date(start);
  while (day <= end) {
    if (day.getDay() !== 0) count++;
    day.setDate(day.getDate() + 1);
  }
  return count;
}

function loanBalance(loan: { amount: Prisma.Decimal | number; remainingBalance: Prisma.Decimal | number | null }) {
  return Number(loan.remainingBalance ?? loan.amount);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function getPendingDebtAmounts(employeeId: string) {
  const loans = await db.employeeLoan.findMany({
    where: { employeeId, status: 'PENDING' },
    select: { amount: true, remainingBalance: true },
  });
  const pendingLoansAmount = roundMoney(loans.reduce((sum, loan) => sum + loanBalance(loan), 0));
  return {
    pendingLoansAmount,
    pendingDebtAmount: pendingLoansAmount,
  };
}

async function payrollPreview(employeeId: string, startDate: string, endDate: string, customWorkdays?: number) {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  if (start > end) throw new Error('La fecha inicial debe ser anterior a la fecha final.');
  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error('Trabajador no encontrado.');
  const [absenceRows, pendingDebt] = await Promise.all([
    db.employeeAbsence.findMany({ where: { employeeId, date: { gte: start, lte: end } }, select: { date: true } }),
    getPendingDebtAmounts(employeeId),
  ]);
  const defaultWorkdays = countWorkdays(start, end);
  const workdays = (typeof customWorkdays === 'number' && Number.isFinite(customWorkdays) && customWorkdays >= 0)
    ? customWorkdays
    : defaultWorkdays;
  const absenceCount = new Set(absenceRows.map((absence) => absence.date.toISOString().slice(0, 10))).size;
  const daily = Number(employee.dailySalary);
  const grossSalary = Math.round(workdays * daily * 100) / 100;
  const absenceDeductions = Math.round(Math.min(workdays, absenceCount) * daily * 100) / 100;
  const availableForLoans = Math.max(0, Math.round((grossSalary - absenceDeductions) * 100) / 100);
  const loanDeductions = 0;
  return {
    employee: { id: employee.id, fullName: employee.fullName, dailySalary: daily, payFrequency: employee.payFrequency },
    start, end, workdays, defaultWorkdays, absenceCount: Math.min(workdays, absenceCount), grossSalary,
    absenceDeductions, loanDeductions,
    netSalary: availableForLoans,
    pendingLoanBalance: pendingDebt.pendingDebtAmount,
    pendingLoansAmount: pendingDebt.pendingLoansAmount,
    pendingDebtAmount: pendingDebt.pendingDebtAmount,
  };
}

export async function getEmployees() {
  try {
    await requireAdmin();
    const employees = await db.employee.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        loans: {
          where: { status: 'PENDING' },
          select: { amount: true, remainingBalance: true },
        },
      },
    });
    return { success: true, data: employees.map((employee) => {
      let pendingLoansTotal = 0;
      for (const loan of employee.loans) pendingLoansTotal += loanBalance(loan);
      pendingLoansTotal = roundMoney(pendingLoansTotal);
      return {
        id: employee.id, fullName: employee.fullName, phone: employee.phone,
        dailySalary: Number(employee.dailySalary), payFrequency: employee.payFrequency,
        isActive: employee.isActive,
        pendingLoansTotal,
        pendingDebtTotal: pendingLoansTotal,
      };
    }) };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudieron cargar los trabajadores.' }; }
}

export async function getActiveEmployees() {
  try {
    const session = await verifySession();
    if (!session || !['master-admin', 'admin', 'cashier'].includes(session.role)) throw new Error('No autorizado.');
    return { success: true, data: await db.employee.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }) };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudieron cargar los trabajadores.' }; }
}

export async function getEmployeeLoanHistory(employeeId: string) {
  try {
    await requireAdmin();
    const loans = await db.employeeLoan.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          orderBy: { createdAt: 'asc' },
          include: { payrollRecord: { select: { startDate: true, endDate: true } } },
        },
      },
    });
    return {
      success: true,
      data: loans.map((loan) => {
        const originalAmount = Number(loan.amount);
        const remainingBalance = loanBalance(loan);
        return {
          id: loan.id,
          date: loan.createdAt,
          description: loan.description,
          originalAmount,
          totalPaid: Math.max(0, originalAmount - remainingBalance),
          remainingBalance,
          status: remainingBalance <= 0.005 ? 'PAID' : remainingBalance < originalAmount ? 'PARTIALLY_PAID' : 'PENDING',
          payments: loan.payments.map((payment) => ({
            id: payment.id,
            amount: Number(payment.amount),
            kind: payment.kind,
            reference: payment.reference,
            createdAt: payment.createdAt,
            payrollStartDate: payment.payrollRecord?.startDate ?? null,
            payrollEndDate: payment.payrollRecord?.endDate ?? null,
          })),
        };
      }),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo cargar el historial de préstamos.', data: [] };
  }
}

export async function getEmployeeActiveLoans(employeeId: string) {
  try {
    await requireAdmin();
    if (!employeeId?.trim()) throw new Error('Trabajador inválido.');
    const loans = await db.employeeLoan.findMany({
      where: { employeeId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      success: true,
      data: loans.map((loan) => ({
        id: loan.id,
        date: loan.createdAt,
        description: loan.description,
        originalAmount: Number(loan.amount),
        remainingBalance: loanBalance(loan),
      })),
    };
  } catch (error) {
    return { success: false, data: [], error: error instanceof Error ? error.message : 'No se pudieron cargar los préstamos activos.' };
  }
}

export async function getEmployeePayrollHistory(employeeId: string) {
  try {
    await requireAdmin();
    const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true } });
    if (!employee) throw new Error('Trabajador no encontrado.');
    const records = await db.payrollRecord.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const data = await Promise.all(records.map(async (record) => {
      const absences = await db.employeeAbsence.findMany({
        where: { employeeId, date: { gte: record.startDate, lte: record.endDate } },
        select: { date: true },
      });
      const absenceCount = new Set(absences.map((absence) => absence.date.toISOString().slice(0, 10))).size;
      return {
        id: record.id,
        startDate: record.startDate,
        endDate: record.endDate,
        createdAt: record.createdAt,
        workdays: record.workdays ?? countWorkdays(record.startDate, record.endDate),
        absenceCount,
        grossSalary: Number(record.grossSalary),
        absenceDeductions: Number(record.absenceDeductions),
        loanDeductions: Number(record.loanDeductions),
        netSalary: Number(record.netSalary),
      };
    }));
    return { success: true, employee, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo cargar el historial de nómina.', data: [] };
  }
}

export async function createEmployee(input: { fullName: string; phone?: string; dailySalary: number; payFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' }) {
  try {
    await requireAdmin();
    if (!input.fullName?.trim() || !Number.isFinite(input.dailySalary) || input.dailySalary <= 0) throw new Error('Nombre y salario diario válido son obligatorios.');
    const employee = await db.employee.create({ data: {
      id: generateUUID(), fullName: input.fullName.trim(), phone: input.phone?.trim() || null,
      dailySalary: new Prisma.Decimal(input.dailySalary), payFrequency: input.payFrequency, isActive: true,
    } });
    revalidatePath('/employees');
    return { success: true, data: { ...employee, dailySalary: Number(employee.dailySalary) } };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo crear el trabajador.' }; }
}

export async function updateEmployee(input: {
  id: string;
  fullName: string;
  dailySalary: number;
  payFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
  isActive: boolean;
}) {
  try {
    await requireAdmin();
    if (!input.id?.trim()) throw new Error('Trabajador inválido.');
    const fullName = input.fullName?.trim();
    if (!fullName) throw new Error('El nombre completo es obligatorio.');
    if (!Number.isFinite(input.dailySalary) || input.dailySalary <= 0) throw new Error('El salario diario debe ser mayor que cero.');
    if (!['DAILY', 'WEEKLY', 'BIWEEKLY'].includes(input.payFrequency)) throw new Error('La frecuencia de pago no es válida.');
    if (typeof input.isActive !== 'boolean') throw new Error('El estado del trabajador no es válido.');

    const employee = await db.employee.update({
      where: { id: input.id },
      data: {
        fullName,
        dailySalary: new Prisma.Decimal(input.dailySalary),
        payFrequency: input.payFrequency,
        isActive: input.isActive,
      },
    });
    revalidatePath('/employees');
    return { success: true, data: { ...employee, dailySalary: Number(employee.dailySalary) } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el trabajador.' };
  }
}

export async function setEmployeeActive(employeeId: string, isActive: boolean) {
  try {
    await requireAdmin();
    await db.employee.update({ where: { id: employeeId }, data: { isActive } });
    revalidatePath('/employees');
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el trabajador.' }; }
}

export async function deleteEmployee(employeeId: string) {
  try {
    await requireAdmin();
    if (!employeeId?.trim()) throw new Error('Trabajador inválido.');

    const result = await db.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
      if (!employee) throw new Error('Trabajador no encontrado.');

      const [loanCount, payrollCount, absenceCount] = await Promise.all([
        tx.employeeLoan.count({ where: { employeeId } }),
        tx.payrollRecord.count({ where: { employeeId } }),
        tx.employeeAbsence.count({ where: { employeeId } }),
      ]);

      if (loanCount > 0 || payrollCount > 0 || absenceCount > 0) {
        await tx.employee.update({ where: { id: employeeId }, data: { isActive: false } });
        return { mode: 'deactivated' as const, message: 'Trabajador marcado como inactivo para proteger su historial.' };
      }

      await tx.employee.delete({ where: { id: employeeId } });
      return { mode: 'deleted' as const, message: 'Trabajador eliminado correctamente.' };
    });

    revalidatePath('/employees');
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo procesar la eliminación.' };
  }
}

export async function createEmployeeLoan(employeeId: string, amount: number, description: string) {
  try {
    await requireAdmin();
    if (!Number.isFinite(amount) || amount <= 0 || !description.trim()) throw new Error('Monto y descripción del préstamo son obligatorios.');
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee?.isActive) throw new Error('El trabajador no existe o está inactivo.');
    const loan = await db.employeeLoan.create({ data: {
      id: generateUUID(), employeeId, amount: new Prisma.Decimal(amount), remainingBalance: new Prisma.Decimal(amount),
      description: description.trim(), status: 'PENDING',
    } });
    revalidatePath('/employees');
    return { success: true, data: { ...loan, amount: Number(loan.amount) } };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo registrar el préstamo.' }; }
}

export async function createEmployeeAbsence(employeeId: string, date: string, reason?: string) {
  try {
    await requireAdmin();
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error('Trabajador no encontrado.');
    const absence = await db.employeeAbsence.create({ data: {
      id: generateUUID(), employeeId, date: parseDate(date), reason: reason?.trim() || null,
    } });
    revalidatePath('/employees');
    return { success: true, data: absence };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo registrar la falta.' }; }
}

export async function previewEmployeePayroll(employeeId: string, startDate: string, endDate: string, customWorkdays?: number) {
  try { await requireAdmin(); return { success: true, data: await payrollPreview(employeeId, startDate, endDate, customWorkdays) }; }
  catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo calcular la nómina.' }; }
}

export async function processEmployeePayroll(employeeId: string, startDate: string, endDate: string, requestedLoanDeduction = 0, customWorkdays?: number) {
  try {
    await requireAdmin();
    if (!Number.isFinite(requestedLoanDeduction) || requestedLoanDeduction < 0) throw new Error('El descuento debe ser un monto válido igual o mayor que cero.');
    const deductionRequest = roundMoney(requestedLoanDeduction);
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);
    if (start > end) throw new Error('La fecha inicial debe ser anterior a la fecha final.');
    const record = await db.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new Error('Trabajador no encontrado.');
      const [absenceRows, pendingLoans] = await Promise.all([
        tx.employeeAbsence.findMany({ where: { employeeId, date: { gte: start, lte: end } }, select: { date: true } }),
        tx.employeeLoan.findMany({ where: { employeeId, status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
      ]);
      const pendingLoansBalance = roundMoney(pendingLoans.reduce((sum, loan) => sum + loanBalance(loan), 0));

      const defaultWorkdays = countWorkdays(start, end);
      const workdays = (typeof customWorkdays === 'number' && Number.isFinite(customWorkdays) && customWorkdays >= 0)
        ? customWorkdays
        : defaultWorkdays;
      const absenceCount = Math.min(workdays, new Set(absenceRows.map((absence) => absence.date.toISOString().slice(0, 10))).size);
      const grossSalary = roundMoney(workdays * Number(employee.dailySalary));
      const absenceDeductions = roundMoney(absenceCount * Number(employee.dailySalary));
      const availableForDeductions = roundMoney(Math.max(0, grossSalary - absenceDeductions));
      if (deductionRequest > pendingLoansBalance + 0.001) throw new Error('El descuento supera el saldo pendiente de préstamos.');
      if (deductionRequest > availableForDeductions + 0.001) throw new Error('El descuento supera el salario disponible después de descontar las faltas.');

      const loanDeductions = deductionRequest;
      const netSalary = roundMoney(Math.max(0, availableForDeductions - deductionRequest));
      const payrollRecord = await tx.payrollRecord.create({ data: {
        id: generateUUID(), employeeId, startDate: start, endDate: end,
        workdays,
        grossSalary: new Prisma.Decimal(grossSalary),
        absenceDeductions: new Prisma.Decimal(absenceDeductions),
        loanDeductions: new Prisma.Decimal(loanDeductions),
        netSalary: new Prisma.Decimal(netSalary),
      } });

      let remainingDeduction = deductionRequest;
      for (const loan of pendingLoans) {
        if (remainingDeduction <= 0.001) break;
        const balance = loanBalance(loan);
        const applied = roundMoney(Math.min(balance, remainingDeduction));
        const nextBalance = roundMoney(balance - applied);
        await tx.employeeLoan.update({
          where: { id: loan.id },
          data: {
            remainingBalance: new Prisma.Decimal(nextBalance),
            status: nextBalance <= 0.005 ? 'DEDUCTED' : 'PENDING',
          },
        });
        await tx.employeeLoanPayment.create({ data: {
          id: generateUUID(), loanId: loan.id, payrollRecordId: payrollRecord.id,
          amount: new Prisma.Decimal(applied), kind: 'PAYROLL',
        } });
        remainingDeduction = roundMoney(remainingDeduction - applied);
      }
      if (remainingDeduction > 0.001) throw new Error('No se pudo distribuir el descuento completo entre préstamos pendientes.');
      return payrollRecord;
    });
    revalidatePath('/employees');
    return {
      success: true,
      data: {
        ...record,
        grossSalary: Number(record.grossSalary),
        absenceDeductions: Number(record.absenceDeductions),
        loanDeductions: Number(record.loanDeductions),
        netSalary: Number(record.netSalary),
      },
    };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'No se pudo procesar la nómina.' }; }
}

export async function registerEmployeeLoanPayment(employeeId: string, loanId: string, amount: number, concept?: string, date?: string) {
  try {
    await requireAdmin();
    if (!employeeId?.trim() || !loanId?.trim()) throw new Error('Préstamo inválido.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto del abono debe ser mayor que cero.');
    const normalizedAmount = roundMoney(amount);
    const paymentDate = date ? parseDate(date) : new Date();
    const reference = (concept?.trim() || 'Abono a préstamo').slice(0, 170);

    const loan = await db.$transaction(async (tx) => {
      const current = await tx.employeeLoan.findUnique({ where: { id: loanId } });
      if (!current) throw new Error('Préstamo no encontrado.');
      if (current.employeeId !== employeeId) throw new Error('El préstamo no pertenece al trabajador.');
      const balance = loanBalance(current);
      if (balance <= 0.005) throw new Error('El préstamo ya está saldado.');
      if (normalizedAmount > balance + 0.001) throw new Error('El abono supera el saldo pendiente del préstamo.');
      const nextBalance = roundMoney(balance - normalizedAmount);
      const updated = await tx.employeeLoan.update({
        where: { id: loanId },
        data: {
          remainingBalance: new Prisma.Decimal(nextBalance),
          status: nextBalance <= 0.005 ? 'DEDUCTED' : 'PENDING',
        },
      });
      await tx.employeeLoanPayment.create({
        data: {
          id: generateUUID(),
          loanId,
          amount: new Prisma.Decimal(normalizedAmount),
          kind: 'CASH',
          reference,
          createdAt: paymentDate,
        },
      });
      return updated;
    });

    revalidatePath('/employees');
    const remainingBalance = Number(loan.remainingBalance);
    return {
      success: true,
      data: {
        ...loan,
        amount: Number(loan.amount),
        remainingBalance,
        totalPaid: roundMoney(Number(loan.amount) - remainingBalance),
        paidAmount: normalizedAmount,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo registrar el abono al préstamo.' };
  }
}
