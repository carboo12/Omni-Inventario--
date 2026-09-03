import { getDeliveryRoutes } from '@/lib/actions/delivery-routes';
import DeliveryRoutesClient from './client';
import { BusinessGuard } from '@/lib/business-guard';
import { redirect } from '@/lib/router-nav';

export default async function DeliveryRoutesPage() {
  const mode = await BusinessGuard.getCurrentMode();
  if (mode !== 'DISTRIBUIDORA') redirect('/dashboard');

  const result = await getDeliveryRoutes();
  const routes = result.success ? result.data : [];

  return <DeliveryRoutesClient initialRoutes={routes} />;
}
