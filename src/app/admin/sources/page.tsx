import React from 'react';
import { getSources } from '@/lib/actions/sources';
import { SourcesClient } from '@/components/sources/SourcesClient';

export const revalidate = 0;

export default async function SourcesPage() {
  const sources = await getSources();
  return <SourcesClient initialSources={sources} />;
}
