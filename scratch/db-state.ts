import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
(async () => {
  try {
    console.log('payrollCount', await db.payrollRecord.count());
    const pr = await db.payrollRecord.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('payroll', pr.map((r) => ({ emp: r.employeeId, net: String(r.netSalary), loan: String(r.loanDeductions), start: r.startDate, end: r.endDate })));
    const loans = await db.employeeLoan.findMany({ orderBy: { createdAt: 'desc' } });
    console.log('loans', loans.map((l) => ({ d: l.description, a: String(l.amount), r: String(l.remainingBalance), s: l.status })));
    const emps = await db.employee.findMany();
    console.log('employees', emps.map((e) => ({ name: e.fullName, freq: e.payFrequency, active: e.isActive })));
  } catch (e) { console.error(e); } finally { await db.$disconnect(); }
})();
