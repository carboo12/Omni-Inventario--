import React from 'react';
import AuditClient from './client';
import { getAuditLogs } from '@/lib/actions/audit';

export default async function AuditPage() {
    const result = await getAuditLogs(200); // Fetch last 200 logs
    const logs = result.success ? result.data : [];

    return (
        <AuditClient initialLogs={logs as any[]} />
    );
}
