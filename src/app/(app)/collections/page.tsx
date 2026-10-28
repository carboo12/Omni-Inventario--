import { getCollections } from '@/lib/actions/collections';
import CollectionsClient from './client';
import { BusinessGuard } from '@/lib/business-guard';
import { redirect } from '@/lib/router-nav';

export default async function CollectionsPage() {
  const mode = await BusinessGuard.getCurrentMode();
  if (mode !== 'DISTRIBUIDORA') redirect('/dashboard');

  let collections: unknown[] = [];
  try {
    const result = await getCollections();
    collections = result?.success && Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Error loading collections page:', error);
  }

  return <CollectionsClient initialCollections={collections} />;
}
