import { getCollections } from '@/lib/actions/collections';
import CollectionsClient from './client';
import { BusinessGuard } from '@/lib/business-guard';
import { redirect } from '@/lib/router-nav';

export default async function CollectionsPage() {
  const mode = await BusinessGuard.getCurrentMode();
  if (mode !== 'DISTRIBUIDORA') redirect('/dashboard');

  const result = await getCollections();
  const collections = result.success ? result.data : [];

  return <CollectionsClient initialCollections={collections} />;
}
