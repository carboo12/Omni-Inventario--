// GENERADO AUTOMÁTICAMENTE. No editar.
// Wrappers de transporte para el módulo 'employees' (llaman a la API).
import { callAction } from '../api-client';

import type { Prisma } from '@prisma/client';

export async function getEmployees(...args: any[]): Promise<any> {
  return callAction('employees', 'getEmployees', args);
}

export async function getActiveEmployees(...args: any[]): Promise<any> {
  return callAction('employees', 'getActiveEmployees', args);
}

export async function getEmployeeLoanHistory(...args: any[]): Promise<any> {
  return callAction('employees', 'getEmployeeLoanHistory', args);
}

export async function getEmployeeActiveLoans(...args: any[]): Promise<any> {
  return callAction('employees', 'getEmployeeActiveLoans', args);
}

export async function getEmployeePayrollHistory(...args: any[]): Promise<any> {
  return callAction('employees', 'getEmployeePayrollHistory', args);
}

export async function createEmployee(...args: any[]): Promise<any> {
  return callAction('employees', 'createEmployee', args);
}

export async function updateEmployee(...args: any[]): Promise<any> {
  return callAction('employees', 'updateEmployee', args);
}

export async function setEmployeeActive(...args: any[]): Promise<any> {
  return callAction('employees', 'setEmployeeActive', args);
}

export async function deleteEmployee(...args: any[]): Promise<any> {
  return callAction('employees', 'deleteEmployee', args);
}

export async function createEmployeeLoan(...args: any[]): Promise<any> {
  return callAction('employees', 'createEmployeeLoan', args);
}

export async function createEmployeeAbsence(...args: any[]): Promise<any> {
  return callAction('employees', 'createEmployeeAbsence', args);
}

export async function previewEmployeePayroll(...args: any[]): Promise<any> {
  return callAction('employees', 'previewEmployeePayroll', args);
}

export async function processEmployeePayroll(...args: any[]): Promise<any> {
  return callAction('employees', 'processEmployeePayroll', args);
}

export async function registerEmployeeLoanPayment(...args: any[]): Promise<any> {
  return callAction('employees', 'registerEmployeeLoanPayment', args);
}
