"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarPlus, ChevronDown, ChevronRight, CircleDollarSign, FileClock, HandCoins, History, Pencil, Plus, Printer, RefreshCw, UserRoundX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  createEmployee,
  createEmployeeAbsence,
  createEmployeeLoan,
  deleteEmployee,
  getEmployeeActiveLoans,
  getEmployeeLoanHistory,
  getEmployeePayrollHistory,
  getEmployees,
  previewEmployeePayroll,
  processEmployeePayroll,
  registerEmployeeLoanPayment,
  setEmployeeActive,
  updateEmployee,
} from '@/lib/actions-client/employees';
import { printPayrollStub } from '@/lib/print-payroll-stub';

type EmployeeRow = {
  id: string;
  fullName: string;
  phone?: string | null;
  dailySalary: number;
  payFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY';
  isActive: boolean;
  pendingLoansTotal: number;
  pendingDebtTotal?: number;
};

type PayrollPreview = {
  employee: { fullName: string; dailySalary: number; payFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' };
  workdays: number;
  defaultWorkdays?: number;
  absenceCount: number;
  grossSalary: number;
  absenceDeductions: number;
  loanDeductions: number;
  pendingLoanBalance?: number;
  pendingLoansAmount?: number;
  pendingDebtAmount?: number;
  netSalary: number;
};

type ActiveLoanOption = {
  id: string;
  date: Date | string;
  description: string;
  originalAmount: number;
  remainingBalance: number;
};

type LoanHistoryItem = {
  id: string;
  date: Date | string;
  description: string;
  originalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
  payments: {
    id: string;
    amount: number;
    kind: 'PAYROLL' | 'CASH';
    reference?: string | null;
    createdAt: Date | string;
    payrollStartDate?: Date | string | null;
    payrollEndDate?: Date | string | null;
  }[];
};

type PayrollHistoryItem = {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  createdAt: Date | string;
  workdays: number;
  absenceCount: number;
  grossSalary: number;
  absenceDeductions: number;
  loanDeductions: number;
  netSalary: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const historyDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-NI');
};
const money = (value: number) =>
  `C$ ${Number(value || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EmployeesClient() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [frequency, setFrequency] = useState('ALL');
  const [status, setStatus] = useState('ACTIVE');
  const [dialog, setDialog] = useState<'create' | 'edit' | 'absence' | 'loan' | 'loanPayment' | 'payroll' | null>(null);
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeRow | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailySalary, setDailySalary] = useState('');
  const [payFrequency, setPayFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY'>('WEEKLY');
  const [editEmployeeIsActive, setEditEmployeeIsActive] = useState(true);
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [activeLoans, setActiveLoans] = useState<ActiveLoanOption[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [loansLoading, setLoansLoading] = useState(false);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [workdaysInput, setWorkdaysInput] = useState('6');
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [loanDeduction, setLoanDeduction] = useState('0.00');
  const [pendingLoansAmount, setPendingLoansAmount] = useState<number | null>(null);
  const [loadingLoanBalance, setLoadingLoanBalance] = useState(false);

  // History dialogs
  const [loanHistoryEmployee, setLoanHistoryEmployee] = useState<EmployeeRow | null>(null);
  const [loanHistory, setLoanHistory] = useState<LoanHistoryItem[]>([]);
  const [payrollHistoryEmployee, setPayrollHistoryEmployee] = useState<EmployeeRow | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadEmployees = async () => {
    setLoading(true);
    const result = await getEmployees();
    if (result.success) setEmployees(result.data || []);
    else toast({ title: 'Error al cargar trabajadores', description: result.error, variant: 'destructive' });
    setLoading(false);
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const filtered = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
          (frequency === 'ALL' || employee.payFrequency === frequency) &&
          (status === 'ALL' || employee.isActive === (status === 'ACTIVE')),
      ),
    [employees, search, frequency, status],
  );

  const refreshPendingLoansAmount = async (employeeId: string) => {
    setLoadingLoanBalance(true);
    try {
      const result = await getEmployees();
      if (!result.success) return null;
      const employee = (result.data || []).find((row: EmployeeRow) => row.id === employeeId);
      const total = Number(employee?.pendingDebtTotal ?? employee?.pendingLoansTotal);
      if (!employee || !Number.isFinite(total)) return null;
      setPendingLoansAmount(total);
      return total;
    } catch {
      return null;
    } finally {
      setLoadingLoanBalance(false);
    }
  };

  const loadActiveLoans = async (employeeId: string) => {
    setLoansLoading(true);
    try {
      const result = await getEmployeeActiveLoans(employeeId);
      if (!result.success) throw new Error(result.error || 'No se pudieron cargar los préstamos activos.');
      setActiveLoans(result.data || []);
    } catch (error) {
      setActiveLoans([]);
      toast({
        title: 'No se pudieron cargar los préstamos',
        description: error instanceof Error ? error.message : 'Error de comunicación.',
        variant: 'destructive',
      });
    } finally {
      setLoansLoading(false);
    }
  };

  const openAction = (kind: 'absence' | 'loan' | 'payroll' | 'loanPayment', employee: EmployeeRow) => {
    setSelected(employee);
    setReason('');
    setAmount('');
    setDate(today());
    setSelectedLoanId('');
    setActiveLoans([]);
    setStartDate(today());
    setEndDate(today());
    setWorkdaysInput(employee.payFrequency === 'DAILY' ? '1' : employee.payFrequency === 'BIWEEKLY' ? '12' : '6');
    setPreview(null);
    setLoanDeduction('0.00');
    setPendingLoansAmount(employee.pendingDebtTotal ?? employee.pendingLoansTotal);
    setDialog(kind);
    if (kind === 'loanPayment') void loadActiveLoans(employee.id);
    if (kind === 'payroll') void refreshPendingLoansAmount(employee.id);
  };

  const openLoanPayment = (employee: EmployeeRow) => {
    openAction('loanPayment', employee);
  };

  const saveEmployee = async () => {
    setSaving(true);
    const result = await createEmployee({ fullName, phone, dailySalary: Number(dailySalary), payFrequency });
    setSaving(false);
    if (!result.success) return toast({ title: 'No se pudo guardar', description: result.error, variant: 'destructive' });
    toast({ title: 'Trabajador creado' });
    setDialog(null);
    setFullName('');
    setPhone('');
    setDailySalary('');
    await loadEmployees();
  };

  const openEditEmployee = (employee: EmployeeRow) => {
    setSelected(employee);
    setFullName(employee.fullName);
    setDailySalary(String(employee.dailySalary));
    setPayFrequency(employee.payFrequency);
    setEditEmployeeIsActive(employee.isActive);
    setDialog('edit');
  };

  const saveEmployeeChanges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await updateEmployee({
        id: selected.id,
        fullName,
        dailySalary: Number(dailySalary),
        payFrequency,
        isActive: editEmployeeIsActive,
      });
      if (!result.success) {
        toast({ title: 'No se pudo actualizar el trabajador', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Trabajador actualizado', description: 'Los cambios se guardaron correctamente.' });
      setDialog(null);
      setSelected(null);
      await loadEmployees();
    } catch (error) {
      toast({
        title: 'No se pudo actualizar el trabajador',
        description: error instanceof Error ? error.message : 'Error de comunicación con el servidor.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAbsence = async () => {
    if (!selected) return;
    setSaving(true);
    const result = await createEmployeeAbsence(selected.id, date, reason);
    setSaving(false);
    if (!result.success) return toast({ title: 'No se pudo registrar la falta', description: result.error, variant: 'destructive' });
    toast({ title: 'Falta registrada' });
    setDialog(null);
  };

  const saveLoan = async () => {
    if (!selected) return;
    setSaving(true);
    const result = await createEmployeeLoan(selected.id, Number(amount), reason);
    setSaving(false);
    if (!result.success) return toast({ title: 'No se pudo registrar el préstamo', description: result.error, variant: 'destructive' });
    toast({ title: 'Préstamo registrado' });
    setDialog(null);
    await loadEmployees();
  };

  const loadLoanHistory = async (employeeId: string) => {
    const result = await getEmployeeLoanHistory(employeeId);
    if (!result.success) throw new Error(result.error || 'No se pudo cargar el historial de préstamos.');
    const rows = result.data || [];
    setLoanHistory(rows);
    return rows;
  };

  const saveLoanPayment = async () => {
    if (!selected) return;
    const normalizedAmount = Number(amount);
    const normalizedReason = reason.trim();
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return toast({ title: 'Monto inválido', description: 'Ingrese un monto mayor que cero.', variant: 'destructive' });
    }
    if (!selectedLoanId) {
      return toast({ title: 'Préstamo requerido', description: 'Seleccione el préstamo que desea amortizar.', variant: 'destructive' });
    }
    const selectedLoan = activeLoans.find((loan) => loan.id === selectedLoanId);
    if (selectedLoan && normalizedAmount > selectedLoan.remainingBalance + 0.001) {
      return toast({
        title: 'Abono inválido',
        description: `El monto supera el saldo pendiente (${money(selectedLoan.remainingBalance)}).`,
        variant: 'destructive',
      });
    }

    setSaving(true);
    let result: { success?: boolean; error?: string; data?: any } | undefined;
    try {
      result = await registerEmployeeLoanPayment(selected.id, selectedLoanId, normalizedAmount, normalizedReason, date || undefined);
    } catch (error) {
      setSaving(false);
      return toast({
        title: 'No se pudo registrar el abono',
        description: error instanceof Error ? error.message : 'Error de comunicación con el servidor.',
        variant: 'destructive',
      });
    }
    setSaving(false);

    if (!result?.success) {
      return toast({
        title: 'No se pudo registrar el abono',
        description: result?.error || 'El servidor no confirmó el guardado.',
        variant: 'destructive',
      });
    }

    toast({
      title: 'Abono registrado',
      description: `${money(normalizedAmount)} amortizado. Saldo restante: ${money(Number(result.data?.remainingBalance ?? 0))}.`,
    });
    setDialog(null);
    setAmount('');
    setReason('');
    setSelectedLoanId('');
    setActiveLoans([]);

    try {
      await loadEmployees();
      await refreshPendingLoansAmount(selected.id);
      if (loanHistoryEmployee?.id === selected.id) await loadLoanHistory(selected.id);
    } catch {
      return;
    }
  };

  const calculatePayroll = async (overrideDays?: number) => {
    if (!selected) return;
    setSaving(true);
    const daysToUse = typeof overrideDays === 'number' ? overrideDays : Number(workdaysInput || 0);
    const [result, currentBalance] = await Promise.all([
      previewEmployeePayroll(selected.id, startDate, endDate, daysToUse),
      refreshPendingLoansAmount(selected.id),
    ]);
    setSaving(false);
    if (!result.success) return toast({ title: 'No se pudo calcular la nómina', description: result.error, variant: 'destructive' });
    const previewData = result.data as PayrollPreview;
    setPreview(previewData);
    setWorkdaysInput(String(previewData.workdays));
    if (currentBalance !== null) setPendingLoansAmount(currentBalance);
    const suggestedDeduction = Math.min(
      Number(previewData.pendingDebtAmount ?? previewData.pendingLoanBalance ?? 0),
      Number(previewData.netSalary ?? 0),
    );
    setLoanDeduction((Number.isFinite(suggestedDeduction) ? suggestedDeduction : 0).toFixed(2));
  };

  const pay = async () => {
    if (!selected || !preview || !loanDeductionValid) return;
    setSaving(true);
    const finalDays = Number(workdaysInput || preview.workdays);
    const result = await processEmployeePayroll(selected.id, startDate, endDate, loanDeductionAmount, finalDays);
    setSaving(false);
    if (!result.success) return toast({ title: 'No se pudo procesar el pago', description: result.error, variant: 'destructive' });
    toast({
      title: 'Pago de nómina procesado',
      description: `Neto pagado: ${money(result.data.netSalary)}. Abonos a préstamos: ${money(result.data.loanDeductions)}. Días: ${finalDays}.`,
    });
    setDialog(null);
    setPreview(null);
    await loadEmployees();
    if (loanHistoryEmployee?.id === selected.id) await loadLoanHistory(selected.id);
  };

  const toggleActive = async (employee: EmployeeRow) => {
    const result = await setEmployeeActive(employee.id, !employee.isActive);
    if (!result.success) return toast({ title: 'No se pudo actualizar', description: result.error, variant: 'destructive' });
    await loadEmployees();
  };

  const confirmDeleteEmployee = async (): Promise<void> => {
    if (!employeeToDelete) return;
    setSaving(true);
    const result = await deleteEmployee(employeeToDelete.id);
    setSaving(false);
    if (!result.success) {
      toast({ title: 'No se pudo procesar la eliminación', description: result.error, variant: 'destructive' });
      return;
    }
    toast({
      title: result.mode === 'deactivated' ? 'Trabajador inactivado' : 'Trabajador eliminado',
      description: result.message,
    });
    setEmployeeToDelete(null);
    await loadEmployees();
  };

  const showLoanHistory = async (employee: EmployeeRow) => {
    setLoanHistoryEmployee(employee);
    setLoanHistory([]);
    setExpandedLoanId(null);
    setHistoryLoading(true);
    try {
      await loadLoanHistory(employee.id);
    } catch (error) {
      toast({
        title: 'No se pudo cargar el historial de préstamos',
        description: error instanceof Error ? error.message : 'Error de comunicación.',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const showPayrollHistory = async (employee: EmployeeRow) => {
    setPayrollHistoryEmployee(employee);
    setPayrollHistory([]);
    setHistoryLoading(true);
    try {
      const result = await getEmployeePayrollHistory(employee.id);
      if (!result.success)
        return toast({ title: 'No se pudo cargar el historial de nómina', description: result.error, variant: 'destructive' });
      setPayrollHistory(result.data || []);
    } catch (error) {
      toast({
        title: 'No se pudo cargar el historial de nómina',
        description: error instanceof Error ? error.message : 'Error de comunicación.',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const printPayrollRecord = (record: PayrollHistoryItem) => {
    if (!payrollHistoryEmployee) return;
    printPayrollStub({
      employeeName: payrollHistoryEmployee.fullName,
      startDate: record.startDate,
      endDate: record.endDate,
      paidAt: record.createdAt,
      workdays: record.workdays,
      grossSalary: record.grossSalary,
      absenceCount: record.absenceCount,
      absenceDeductions: record.absenceDeductions,
      loanDeductions: record.loanDeductions,
      netSalary: record.netSalary,
    });
  };

  const loanDeductionAmount = Number(loanDeduction || 0);
  const salaryAfterAbsences = preview ? Math.max(0, preview.grossSalary - preview.absenceDeductions) : 0;
  const displayedLoansBalance = preview ? Number(preview.pendingLoansAmount ?? 0) : 0;
  const displayedDebtBalance =
    preview?.pendingDebtAmount ??
    (preview
      ? displayedLoansBalance
      : pendingLoansAmount ?? selected?.pendingDebtTotal ?? selected?.pendingLoansTotal ?? 0);
  const remainingDebtBalance = Math.max(0, displayedDebtBalance - loanDeductionAmount);
  const loanDeductionValid =
    Boolean(preview) &&
    Number.isFinite(loanDeductionAmount) &&
    loanDeductionAmount >= 0 &&
    loanDeductionAmount <= displayedDebtBalance + 0.001 &&
    loanDeductionAmount <= salaryAfterAbsences + 0.001;
  const payrollNetSalary = Math.max(0, salaryAfterAbsences - (Number.isFinite(loanDeductionAmount) ? loanDeductionAmount : 0));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <BriefcaseBusiness /> Control de Personal
          </h1>
          <p className="mt-1 text-muted-foreground">
            Trabajadores, faltas, préstamos y cálculo de nómina por días trabajados.
          </p>
        </div>
        <Button onClick={() => setDialog('create')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo trabajador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trabajadores</CardTitle>
          <CardDescription>
            Cálculo de nómina adaptable por días laborados o fijos y descuento de saldos de préstamos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Buscar por nombre" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
            >
              <option value="ALL">Todas las frecuencias</option>
              <option value="DAILY">Diaria / Variable</option>
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quincenal</option>
            </select>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
              <option value="ALL">Todos los estados</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-muted/60">
                <tr>
                          {['Trabajador', 'Salario diario', 'Frecuencia', 'Deuda total', 'Estado', 'Acciones'].map((column) => (
                    <th key={column} className="px-3 py-3 text-left font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Cargando trabajadores…
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((employee) => (
                    <tr key={employee.id} className="border-t">
                      <td className="px-3 py-3">
                        <div className="font-medium">{employee.fullName}</div>
                        <div className="text-xs text-muted-foreground">{employee.phone || 'Sin teléfono'}</div>
                      </td>
                      <td className="px-3 py-3">{money(employee.dailySalary)}</td>
                      <td className="px-3 py-3">
                        {employee.payFrequency === 'DAILY' ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                            Diario / Variable
                          </Badge>
                        ) : employee.payFrequency === 'WEEKLY' ? (
                          'Semanal'
                        ) : (
                          'Quincenal'
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{money(employee.pendingDebtTotal ?? employee.pendingLoansTotal)}</div>
                        <div className="text-xs text-muted-foreground">
                          Préstamos {money(employee.pendingLoansTotal)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                          {employee.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEditEmployee(employee)}
                            title="Editar trabajador"
                            aria-label={`Editar a ${employee.fullName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openLoanPayment(employee)}
                            title="Registrar abono a un préstamo"
                          >
                            <HandCoins className="mr-1 h-4 w-4" />
                            Abono
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction('absence', employee)} title="Registrar falta">
                            <CalendarPlus className="mr-1 h-4 w-4" />
                            Falta
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction('loan', employee)} title="Registrar préstamo">
                            <CircleDollarSign className="mr-1 h-4 w-4" />
                            Préstamo
                          </Button>
                          <Button size="sm" onClick={() => openAction('payroll', employee)}>
                            Generar pago
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void showLoanHistory(employee)}
                            title="Historial de préstamos y abonos"
                          >
                            <History className="mr-1 h-4 w-4" />
                            Préstamos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void showPayrollHistory(employee)}
                            title="Historial de pagos"
                          >
                            <FileClock className="mr-1 h-4 w-4" />
                            Pagos
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title={employee.isActive ? 'Eliminar o inactivar' : 'Activar'}
                            onClick={() => (employee.isActive ? setEmployeeToDelete(employee) : void toggleActive(employee))}
                          >
                            <UserRoundX className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No hay trabajadores para estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadEmployees()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </CardContent>
      </Card>

      {/* DIÁLOGO: CREAR TRABAJADOR */}
      <Dialog open={dialog === 'create'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo trabajador</DialogTitle>
            <DialogDescription>Registra salario diario y frecuencia de pago.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="employee-name">Nombre completo</Label>
              <Input id="employee-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="employee-phone">Teléfono (opcional)</Label>
              <Input id="employee-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="employee-salary">Salario diario (C$)</Label>
              <Input
                id="employee-salary"
                type="number"
                min="0.01"
                step="0.01"
                value={dailySalary}
                onChange={(event) => setDailySalary(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employee-frequency">Frecuencia de pago</Label>
              <select
                id="employee-frequency"
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={payFrequency}
                onChange={(event) => setPayFrequency(event.target.value as 'DAILY' | 'WEEKLY' | 'BIWEEKLY')}
              >
                <option value="DAILY">Diario / Variable (días ajustables)</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEmployee()} disabled={saving || !fullName.trim() || Number(dailySalary) <= 0}>
              {saving ? 'Guardando…' : 'Guardar trabajador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EDITAR TRABAJADOR */}
      <Dialog open={dialog === 'edit'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar trabajador</DialogTitle>
            <DialogDescription>Actualiza los datos laborales de {selected?.fullName || 'este trabajador'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-employee-name">Nombre completo</Label>
              <Input id="edit-employee-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-employee-salary">Salario diario (C$)</Label>
              <Input
                id="edit-employee-salary"
                type="number"
                min="0.01"
                step="0.01"
                value={dailySalary}
                onChange={(event) => setDailySalary(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-employee-frequency">Frecuencia de pago</Label>
              <select
                id="edit-employee-frequency"
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={payFrequency}
                onChange={(event) => setPayFrequency(event.target.value as 'DAILY' | 'WEEKLY' | 'BIWEEKLY')}
              >
                <option value="DAILY">Diario / Variable</option>
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quincenal</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm" htmlFor="edit-employee-active">
              <input
                id="edit-employee-active"
                type="checkbox"
                checked={editEmployeeIsActive}
                onChange={(event) => setEditEmployeeIsActive(event.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Trabajador activo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={() => void saveEmployeeChanges()} disabled={saving || !fullName.trim() || !Number.isFinite(Number(dailySalary)) || Number(dailySalary) <= 0}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: REGISTRAR ABONO A PRÉSTAMO */}
      <Dialog open={dialog === 'loanPayment'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <HandCoins className="h-5 w-5" />
              Registrar Abono a Préstamo
            </DialogTitle>
            <DialogDescription>
              Trabajador: <b>{selected?.fullName}</b>. El abono reduce directamente el saldo del préstamo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="loan-payment-date">Fecha del abono</Label>
              <Input id="loan-payment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="loan-payment-select">Préstamo a amortizar</Label>
              <select
                id="loan-payment-select"
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedLoanId}
                disabled={loansLoading || !activeLoans.length}
                onChange={(event) => setSelectedLoanId(event.target.value)}
              >
                <option value="">
                  {loansLoading ? 'Cargando préstamos…' : activeLoans.length ? 'Seleccione un préstamo' : 'Sin préstamos pendientes'}
                </option>
                {activeLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.description} — saldo {money(loan.remainingBalance)}
                  </option>
                ))}
              </select>
              {selectedLoanId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Saldo pendiente: <b>{money(activeLoans.find((loan) => loan.id === selectedLoanId)?.remainingBalance ?? 0)}</b>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="loan-payment-amount">Monto del abono (C$)</Label>
              <Input
                id="loan-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 500.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="loan-payment-reason">Concepto / Motivo (opcional)</Label>
              <Input
                id="loan-payment-reason"
                placeholder="Ej. Abono en efectivo"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void saveLoanPayment()}
              disabled={
                saving ||
                Number(amount) <= 0 ||
                !selectedLoanId ||
                loansLoading ||
                !activeLoans.length
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Guardando…' : 'Registrar abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: REGISTRAR FALTA */}
      <Dialog open={dialog === 'absence'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar falta</DialogTitle>
            <DialogDescription>{selected?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="absence-date">Fecha</Label>
              <Input id="absence-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="absence-reason">Motivo (opcional)</Label>
              <Input id="absence-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveAbsence()} disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar falta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: PRÉSTAMO */}
      <Dialog open={dialog === 'loan'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Préstamo directo</DialogTitle>
            <DialogDescription>{selected?.fullName}; quedará pendiente para descontarlo en nómina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="loan-amount">Monto (C$)</Label>
              <Input
                id="loan-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="loan-reason">Descripción</Label>
              <Input id="loan-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveLoan()} disabled={saving || Number(amount) <= 0 || !reason.trim()}>
              {saving ? 'Guardando…' : 'Registrar préstamo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: GENERAR PAGO DE NÓMINA (CON DÍAS TRABAJADOS AJUSTABLES) */}
      <Dialog
        open={dialog === 'payroll'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setPreview(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Generar pago de nómina</DialogTitle>
            <DialogDescription>
              {selected?.fullName} · Salario diario: <b>{money(selected?.dailySalary || 0)}</b> · Frecuencia:{' '}
              {selected?.payFrequency === 'DAILY'
                ? 'Diaria / Variable'
                : selected?.payFrequency === 'WEEKLY'
                  ? 'Semanal'
                  : 'Quincenal'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="payroll-start">Fecha inicio</Label>
              <Input
                id="payroll-start"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="payroll-end">Fecha fin</Label>
              <Input
                id="payroll-end"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPreview(null);
                }}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payroll-workdays" className="font-semibold text-sm">
                Días Trabajados en el Período:
              </Label>
              <Input
                id="payroll-workdays"
                type="number"
                min="0"
                max="31"
                step="0.5"
                className="w-28 text-right font-bold text-base"
                value={workdaysInput}
                onChange={(event) => {
                  setWorkdaysInput(event.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes ajustar los días trabajados libremente de 1 a 7 días (o más según el rango). El salario devengado
              se calculará como (Días Trabajados × Salario Diario).
            </p>
          </div>

          <Button variant="outline" onClick={() => void calculatePayroll()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Calcular nómina con {workdaysInput || '0'} días
          </Button>

          <div className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Deuda total pendiente</span>
              <div className="flex items-center gap-2">
                <b>{money(displayedDebtBalance)}</b>
                {loadingLoanBalance && <span className="text-xs text-muted-foreground">Actualizando…</span>}
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
              <span>Préstamos: {money(displayedLoansBalance)}</span>
            </div>
          </div>

          {preview && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span>Días liquidados</span>
                <b>{preview.workdays} días</b>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Fórmula Salario Bruto</span>
                <span>
                  {preview.workdays} días × {money(preview.employee.dailySalary)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>(+) Salario devengado</span>
                <b>{money(preview.grossSalary)}</b>
              </div>

              {preview.absenceCount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>(−) Faltas registradas ({preview.absenceCount})</span>
                  <b>− {money(preview.absenceDeductions)}</b>
                </div>
              )}

              <div>
                <Label htmlFor="payroll-loan-deduction">Monto a descontar de préstamos</Label>
                <Input
                  id="payroll-loan-deduction"
                  type="number"
                  min="0"
                  step="0.01"
                  max={Math.min(displayedDebtBalance, salaryAfterAbsences)}
                  value={loanDeduction}
                  onChange={(event) => setLoanDeduction(event.target.value)}
                  aria-invalid={!loanDeductionValid}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Se amortiza primero el préstamo más antiguo.
                </p>
                {!loanDeductionValid && (
                  <p className="mt-1 text-xs text-destructive">
                    El descuento no puede exceder la deuda pendiente ni el salario disponible después de faltas (
                    {money(salaryAfterAbsences)}).
                  </p>
                )}
              </div>

              {loanDeductionAmount > 0 && (
                <div className="space-y-1 text-amber-600 dark:text-amber-400">
                  <div className="flex justify-between font-medium">
                    <span>(−) Abono a préstamos</span>
                    <b>− {money(loanDeductionAmount)}</b>
                  </div>
                </div>
              )}

              <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground">
                <span>(=) NETO A PAGAR</span>
                <b className="text-primary text-lg">{money(payrollNetSalary)}</b>
              </div>

              <div className="rounded-md bg-background p-3 text-xs border">
                <b>Estado de la deuda</b>
                <div className="mt-1 space-y-0.5">
                  <div>Deuda actual: {money(displayedDebtBalance)}</div>
                  <div>Descontado en esta nómina: {money(loanDeductionAmount)}</div>
                  <div>
                    Saldo restante: <b>{money(remainingDebtBalance)}</b>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                El descuento amortiza los préstamos pendientes más antiguos. El remanente continúa para los siguientes períodos.
              </p>
            </div>
          )}

          </div>
          <DialogFooter className="shrink-0 border-t bg-background pt-4">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void pay()} disabled={saving || !preview || !loanDeductionValid}>
              <CircleDollarSign className="mr-2 h-4 w-4" />
              {saving ? 'Procesando…' : 'Procesar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: HISTORIAL DE PRÉSTAMOS Y ABONOS */}
      <Dialog
        open={Boolean(loanHistoryEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setLoanHistoryEmployee(null);
            setExpandedLoanId(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Historial de préstamos y abonos</DialogTitle>
            <DialogDescription>
              {loanHistoryEmployee?.fullName} · abonos en caja y amortizaciones por nómina.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto rounded-md border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {['Concepto / Fecha', 'Monto original', 'Total abonado', 'Saldo restante', 'Estado'].map((column) => (
                    <th key={column} className="px-3 py-2 text-left">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Cargando historial…
                    </td>
                  </tr>
                ) : loanHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No hay préstamos formales registrados.
                    </td>
                  </tr>
                ) : (
                  loanHistory.map((loan) => (
                    <Fragment key={loan.id}>
                      <tr key={loan.id} className="border-t">
                        <td className="px-3 py-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="mr-1 h-7 w-7"
                            onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)}
                            aria-label="Mostrar abonos"
                          >
                            {expandedLoanId === loan.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium">{loan.description}</span>
                          <div className="pl-9 text-xs text-muted-foreground">{historyDate(loan.date)}</div>
                        </td>
                        <td className="px-3 py-3">{money(loan.originalAmount)}</td>
                        <td className="px-3 py-3">{money(loan.totalPaid)}</td>
                        <td className="px-3 py-3 font-semibold">{money(loan.remainingBalance)}</td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              loan.status === 'PAID'
                                ? 'secondary'
                                : loan.status === 'PARTIALLY_PAID'
                                  ? 'outline'
                                  : 'default'
                            }
                          >
                            {loan.status === 'PAID' ? 'Saldado' : loan.status === 'PARTIALLY_PAID' ? 'Abono parcial' : 'Pendiente'}
                          </Badge>
                        </td>
                      </tr>
                      {expandedLoanId === loan.id && (
                        <tr key={`${loan.id}-payments`} className="border-t bg-muted/20">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="mb-2 font-medium">Detalle de abonos y deducciones</div>
                            {loan.payments.length ? (
                              <div className="space-y-2">
                                {loan.payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background px-3 py-2"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {payment.kind === 'PAYROLL' ? 'Deducción en nómina' : 'Pago en caja'}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {historyDate(payment.createdAt)}
                                        {payment.payrollStartDate && payment.payrollEndDate
                                          ? ` · período ${historyDate(payment.payrollStartDate)} al ${historyDate(payment.payrollEndDate)}`
                                          : ''}
                                        {payment.reference ? ` · ${payment.reference}` : ''}
                                      </div>
                                    </div>
                                    <b>{money(payment.amount)}</b>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este registro aún no tiene abonos amortizados.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: HISTORIAL DE PAGOS DE NÓMINA */}
      <Dialog open={Boolean(payrollHistoryEmployee)} onOpenChange={(open) => !open && setPayrollHistoryEmployee(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Historial de pagos de nómina</DialogTitle>
            <DialogDescription>
              {payrollHistoryEmployee?.fullName} · hasta 200 liquidaciones recientes con días trabajados.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {['Período', 'Días trab.', 'Salario devengado', 'Faltas', 'Desc. préstamos', 'Neto pagado', 'Acción'].map(
                    (column) => (
                      <th key={column} className="px-3 py-2 text-left">
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Cargando historial…
                    </td>
                  </tr>
                ) : payrollHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No hay pagos de nómina registrados.
                    </td>
                  </tr>
                ) : (
                  payrollHistory.map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="px-3 py-3">
                        {historyDate(record.startDate)} – {historyDate(record.endDate)}
                        <div className="text-xs text-muted-foreground">Pagado: {historyDate(record.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold">{record.workdays}</td>
                      <td className="px-3 py-3">{money(record.grossSalary)}</td>
                      <td className="px-3 py-3">{record.absenceCount} · −{money(record.absenceDeductions)}</td>
                      <td className="px-3 py-3 font-medium text-amber-600 dark:text-amber-400">
                        −{money(record.loanDeductions)}
                      </td>
                      <td className="px-3 py-3 font-bold text-primary">{money(record.netSalary)}</td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" onClick={() => printPayrollRecord(record)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir colilla
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(employeeToDelete)}
        onOpenChange={(open) => !open && setEmployeeToDelete(null)}
        title="¿Eliminar o inactivar trabajador?"
        description={`¿Estás seguro de que deseas eliminar a ${employeeToDelete?.fullName || 'este trabajador'}? Esta acción eliminará su registro de la lista activa. Si el trabajador tiene historial de nóminas o préstamos asociados, su estado pasará a INACTIVO para proteger los registros financieros.`}
        isPending={saving}
        onConfirm={confirmDeleteEmployee}
      />
    </main>
  );
}
