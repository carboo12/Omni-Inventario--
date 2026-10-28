import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { isCreditPayment } from '../src/lib/payment-method';

// Saneamiento único del historial de crédito.
//
// Contexto: el bug de "cuotas residuales" dejó facturas a crédito ya saldadas
// (pendingBalance <= 0.005) que seguían en status 'COMPLETED' y cuotas
// (CreditInstallment) PENDING con amount original aunque su factura estuviera
// pagada. Este script reconcilia ese historial.
//
// ALCANCE (solo facturas a crédito):
//   1. Facturas de crédito con pendingBalance <= 0.005 -> status 'PAID', pendingBalance 0.
//   2. Cuotas asociadas a esas facturas, o con amount <= 0.005 -> status 'PAID', amount 0.
//
// NO toca ventas de contado ni su status 'COMPLETED' (reportes/caja filtran por
// 'COMPLETED'). Idempotente: puede ejecutarse varias veces sin efectos adversos.

const db = new PrismaClient();
const EPS = 0.005;

type Plan = {
  invoices: { id: string; invoiceNumber: number; status: string; pendingBalance: number }[];
  installments: { id: string; saleId: string; amount: number; status: string }[];
};

async function buildPlan(): Promise<Plan> {
  const allInvoices = await db.salesInvoice.findMany({
    select: { id: true, invoiceNumber: true, paymentMethod: true, status: true, pendingBalance: true },
  });

  const creditInvoices = allInvoices.filter((inv) => isCreditPayment(inv.paymentMethod));
  const settledCreditIds = new Set(
    creditInvoices.filter((inv) => Number(inv.pendingBalance) <= EPS).map((inv) => inv.id),
  );

  const invoices = creditInvoices
    .filter((inv) => Number(inv.pendingBalance) <= EPS && inv.status !== 'PAID')
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      pendingBalance: Number(inv.pendingBalance),
    }));

  const allInstallments = await db.creditInstallment.findMany({
    select: { id: true, saleId: true, amount: true, status: true },
  });

  const installments = allInstallments
    .filter(
      (ci) =>
        (Number(ci.amount) <= EPS || settledCreditIds.has(ci.saleId)) &&
        (ci.status !== 'PAID' || Number(ci.amount) !== 0),
    )
    .map((ci) => ({ id: ci.id, saleId: ci.saleId, amount: Number(ci.amount), status: ci.status }));

  return { invoices, installments };
}

async function main() {
  const apply = !process.argv.includes('--dry-run');
  console.log('=== Saneamiento de crédito (reconciliación de cuotas/facturas) ===');
  console.log(`Modo: ${apply ? 'APLICAR' : 'DRY-RUN (sin cambios)'}\n`);

  const plan = await buildPlan();

  console.log(`Facturas a crédito a marcar PAID: ${plan.invoices.length}`);
  for (const inv of plan.invoices) {
    console.log(`  #${inv.invoiceNumber} (${inv.id.slice(0, 8)}...) status=${inv.status} pendingBalance=${inv.pendingBalance}`);
  }

  console.log(`\nCuotas a reconciliar (PAID / amount 0): ${plan.installments.length}`);
  for (const ci of plan.installments) {
    console.log(`  cuota ${ci.id.slice(0, 8)}... sale=${ci.saleId.slice(0, 8)}... status=${ci.status} amount=${ci.amount}`);
  }

  if (!apply) {
    console.log('\nDRY-RUN: no se modificó la base de datos.');
    return;
  }

  const result = await db.$transaction(async (tx) => {
    let invoicesUpdated = 0;
    for (const inv of plan.invoices) {
      const res = await tx.salesInvoice.update({
        where: { id: inv.id },
        data: { status: 'PAID', pendingBalance: 0 },
      });
      if (res) invoicesUpdated++;
    }

    let installmentsUpdated = 0;
    for (const ci of plan.installments) {
      const res = await tx.creditInstallment.update({
        where: { id: ci.id },
        data: { status: 'PAID', amount: 0 },
      });
      if (res) installmentsUpdated++;
    }

    return { invoicesUpdated, installmentsUpdated };
  });

  console.log('\n=== Resultado ===');
  console.log(`Facturas actualizadas: ${result.invoicesUpdated}`);
  console.log(`Cuotas actualizadas: ${result.installmentsUpdated}`);

  const remainingBadInstallments = await db.creditInstallment.count({
    where: { status: { in: ['PENDING', 'OVERDUE'] }, amount: { lte: EPS } },
  });
  const remainingSettledCredit = await db.salesInvoice.count({
    where: { status: { not: 'PAID' }, pendingBalance: { lte: EPS } },
  });
  console.log(`\nVerificación:`);
  console.log(`  Cuotas activas con amount <= ${EPS}: ${remainingBadInstallments}`);
  console.log(`  Facturas no-PAID con pendingBalance <= ${EPS} (incluye contado): ${remainingSettledCredit}`);
}

main()
  .catch((e) => {
    console.error('Saneamiento fallido:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
