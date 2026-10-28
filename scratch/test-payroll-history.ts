import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const db = new PrismaClient();
(async () => {
  const user = await db.user.findFirst({ where: { isEnabled: true } });
  const employee = await db.payrollRecord.findFirst();
  if (!user || !employee) return console.log('missing data');
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'default-secret-key-change-me');
  const token = await new SignJWT({ userId: user.id, role: user.role, expiresAt: new Date(Date.now() + 3600000) })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret);
  const res = await fetch('http://localhost:9125/api/actions/employees/getEmployeePayrollHistory', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `session=${token}` },
    body: JSON.stringify({ args: [employee.employeeId] }),
  });
  console.log('HTTP', res.status, await res.text());
  await db.$disconnect();
})();
