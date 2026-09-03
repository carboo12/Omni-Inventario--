import { getOrderById } from '@/lib/actions/orders';
import OrderDetailClient from './client';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrderById(id);
  const order = result.success ? result.data : null;

  return <OrderDetailClient order={order} />;
}
