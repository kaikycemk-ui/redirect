import React from 'react';
import { getAnalyticsData } from '@/lib/actions/analytics';
import { getSources } from '@/lib/actions/sources';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getLinks } from '@/lib/actions/links';
import { getDevices } from '@/lib/actions/devices';
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient';

export const revalidate = 0;

export default async function AnalyticsPage() {
  const [data, sources, campaigns, links, devices] = await Promise.all([
    getAnalyticsData({ period: '7d' }),
    getSources(),
    getCampaigns(),
    getLinks(),
    getDevices(),
  ]);

  return (
    <AnalyticsClient
      initialData={data}
      sources={sources}
      campaigns={campaigns as any}
      links={links as any}
      devices={devices as any}
    />
  );
}
