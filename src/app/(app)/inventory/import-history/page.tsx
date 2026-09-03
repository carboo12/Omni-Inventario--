import { getImportHistory } from '@/lib/actions/import-history';
import { ImportHistoryClient } from './client';

export default async function ImportHistoryPage() {
    const result = await getImportHistory();
    const history = result.success ? result.data : [];

    return <ImportHistoryClient history={history || []} />;
}
