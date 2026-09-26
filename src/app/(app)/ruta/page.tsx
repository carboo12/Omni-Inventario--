import { getDeliveryInvoices } from '@/lib/actions/sales';
import DeliveryRouteClient from './client';

export default async function RutaPage() {
  const result = await getDeliveryInvoices();
  const invoices = (result.success && result.data) ? result.data : [];

  return <DeliveryRouteClient invoices={invoices} />;
}
