import React from 'react';
import { getDestinations } from '@/lib/actions/destinations';
import { getDevices } from '@/lib/actions/devices';
import { DestinationsClient } from '@/components/destinations/DestinationsClient';

export const revalidate = 0;

export default async function DestinationsPage() {
  const [destinations, devices] = await Promise.all([getDestinations(), getDevices()]);

  return <DestinationsClient initialDestinations={destinations as any} devices={devices as any} />;
}
