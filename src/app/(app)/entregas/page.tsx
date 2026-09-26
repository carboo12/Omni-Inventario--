import { getDeliveryInvoices } from '@/lib/actions/sales';
import DeliveryRouteClient from '../ruta/client';

export default async function EntregasPage() {
  const result = await getDeliveryInvoices();
  const invoices = (result.success && result.data) ? result.data : [];

  return <DeliveryRouteClient invoices={invoices} />;
}
