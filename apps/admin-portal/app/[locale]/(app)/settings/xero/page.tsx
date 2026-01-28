'use client';

import { RefreshCcw } from 'lucide-react';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import {
  XeroConnectionStatus,
  XeroSyncStats,
  XeroSyncJobsTable,
} from '@/components/xero';

export default function XeroStatusPage() {

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={RefreshCcw}
        titleKey="title"
        descriptionKey="subtitle"
        namespace="xeroStatus"
      />

      <div className="space-y-6">
        {/* Connection Status */}
        <XeroConnectionStatus />

        {/* Sync Stats */}
        <XeroSyncStats />

        {/* Sync Jobs Table */}
        <XeroSyncJobsTable />
      </div>
    </div>
  );
}
