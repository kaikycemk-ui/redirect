import React from 'react';
import { getCampaigns } from '@/lib/actions/campaigns';
import { getSources } from '@/lib/actions/sources';
import { CampaignsClient } from '@/components/campaigns/CampaignsClient';

export const revalidate = 0;

export default async function CampaignsPage() {
  const [campaigns, sources] = await Promise.all([getCampaigns(), getSources()]);

  return <CampaignsClient initialCampaigns={campaigns as any} sources={sources} />;
}
