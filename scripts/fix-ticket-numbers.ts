import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

function formatTicketNumber(n: number): string {
  return String(n).padStart(7, '0');
}

async function main() {
  console.log('=== Fix Ticket Numbers Migration ===\n');

  const invoices = await db.salesInvoice.findMany({
    orderBy: { date: 'asc' },
    select: { id: true, invoiceNumber: true, date: true },
  });

  console.log(`Found ${invoices.length} invoices in database.\n`);

  if (invoices.length === 0) {
    console.log('No invoices to process. Exiting.');
    return;
  }

  const OFFSET = 1_000_000_000;

  console.log('Step 1: Moving existing invoice numbers to temporary high values...');
  for (const inv of invoices) {
    const tempNumber = inv.invoiceNumber + OFFSET;
    await db.salesInvoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: tempNumber },
    });
    console.log(`  Moved invoice ${inv.invoiceNumber} -> ${tempNumber}`);
  }

  console.log('\nStep 2: Reassigning sequential ticket numbers...');
  let seq = 1;
  for (const inv of invoices) {
    await db.salesInvoice.update({
      where: { id: inv.id },
      data: { invoiceNumber: seq },
    });
    console.log(`  Invoice ${inv.id.slice(0, 8)}... -> ${formatTicketNumber(seq)}`);
    seq++;
  }

  const nextSeq = seq;
  console.log(`\nStep 3: Setting MySQL AUTO_INCREMENT to ${nextSeq}...`);

  await db.$executeRawUnsafe(
    `ALTER TABLE salesinvoice AUTO_INCREMENT = ${nextSeq}`
  );

  console.log(`  AUTO_INCREMENT set to ${nextSeq}\n`);

  console.log('=== Migration Complete ===');
  console.log(`Processed ${invoices.length} invoices.`);
  console.log(`Next sale will get ticket number: ${formatTicketNumber(nextSeq)}`);

  const verify = await db.salesInvoice.findMany({
    orderBy: { invoiceNumber: 'asc' },
    select: { invoiceNumber: true, date: true },
  });
  console.log('\nVerification (invoice numbers in DB):');
  for (const v of verify) {
    console.log(`  ${formatTicketNumber(v.invoiceNumber)}  (${v.date.toISOString()})`);
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
