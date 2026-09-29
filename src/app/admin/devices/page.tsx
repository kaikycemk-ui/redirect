import React from 'react';
import { getDevices } from '@/lib/actions/devices';
import { DevicesClient } from '@/components/devices/DevicesClient';

export const revalidate = 0;

export default async function DevicesPage() {
  const devices = await getDevices();
  return <DevicesClient initialDevices={devices as any} />;
}
