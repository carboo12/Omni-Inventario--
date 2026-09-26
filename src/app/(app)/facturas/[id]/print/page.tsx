import { getInvoiceByNumber } from '@/lib/actions/sales';
import FacturaPrintClient from './client';

export default async function FacturaPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getInvoiceByNumber(id);
  const invoice = result.success ? result.data : null;

  return <FacturaPrintClient invoice={invoice} />;
}
