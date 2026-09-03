import { getDeliveryRouteById } from '@/lib/actions/delivery-routes';
import RouteDetailClient from './client';

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getDeliveryRouteById(id);
  const route = result.success ? result.data : null;

  return <RouteDetailClient route={route} />;
}
