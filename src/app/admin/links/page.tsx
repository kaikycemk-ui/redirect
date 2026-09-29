import React from 'react';
import { getLinks } from '@/lib/actions/links';
import { getSources } from '@/lib/actions/sources';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getDevices } from '@/lib/actions/devices';
import { LinksClient } from '@/components/links/LinksClient';

export const revalidate = 0;

export default async function LinksPage() {
  const [links, sources, campaigns, devices] = await Promise.all([
    getLinks(),
    getSources(),
    getCampaigns(),
    getDevices(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <LinksClient
      initialLinks={links as any}
      sources={sources}
      campaigns={campaigns as any}
      devices={devices as any}
      appUrl={appUrl}
    />
  );
}
