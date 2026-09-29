import React from 'react';
import { getSettings } from '@/lib/actions/settings';
import { SettingsClient } from '@/components/settings/SettingsClient';

export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsClient initialSettings={settings} />;
}
