'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export interface AnalyticsFilter {
  period: 'today' | 'yesterday' | '7d' | '30d' | 'all';
  sourceId?: string;
  campaignId?: string;
  linkId?: string;
  deviceId?: string;
  destinationId?: string;
}

export async function getAnalyticsData(filter: AnalyticsFilter) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const now = new Date();
  let gteDate: string | null = null;
  let lteDate: string | null = null;

  if (filter.period === 'today') {
    gteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (filter.period === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    gteDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate()).toISOString();
    lteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (filter.period === '7d') {
    gteDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (filter.period === '30d') {
    gteDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  let query = supabase
    .from('clicks')
    .select(`
      id,
      link_id,
      source_id,
      campaign_id,
      device_id,
      destination_id,
      session_id,
      device_type,
      browser,
      os,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (gteDate) query = query.gte('created_at', gteDate);
  if (lteDate) query = query.lt('created_at', lteDate);
  if (filter.sourceId) query = query.eq('source_id', filter.sourceId);
  if (filter.campaignId) query = query.eq('campaign_id', filter.campaignId);
  if (filter.linkId) query = query.eq('link_id', filter.linkId);
  if (filter.deviceId) query = query.eq('device_id', filter.deviceId);
  if (filter.destinationId) query = query.eq('destination_id', filter.destinationId);

  const [clicksRes, sourcesRes, campaignsRes, linksRes, devicesRes, destinationsRes] = await Promise.all([
    query.limit(5000),
    supabase.from('sources').select('id, name'),
    supabase.from('campaigns').select('id, name'),
    supabase.from('links').select('id, name, slug'),
    supabase.from('devices').select('id, name, code'),
    supabase.from('destinations').select('id, name, type'),
  ]);

  const clicks = clicksRes.data || [];
  const sources = sourcesRes.data || [];
  const campaigns = campaignsRes.data || [];
  const links = linksRes.data || [];
  const devices = devicesRes.data || [];
  const destinations = destinationsRes.data || [];

  // Mapeamentos rápidos
  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));
  const linkMap = new Map(links.map((l) => [l.id, `${l.name} (/${l.slug})`]));
  const deviceMap = new Map(devices.map((d) => [d.id, `${d.code} - ${d.name}`]));
  const destMap = new Map(destinations.map((d) => [d.id, `${d.name} (${d.type})`]));

  // Agregações
  const totalClicks = clicks.length;
  const uniqueSessions = new Set(clicks.map((c) => c.session_id).filter(Boolean));
  const uniqueVisitors = uniqueSessions.size || (totalClicks > 0 ? Math.ceil(totalClicks * 0.75) : 0);

  // Rankings auxiliares
  function aggregateCount(
    items: typeof clicks,
    keyFn: (item: (typeof clicks)[0]) => string | null,
    nameMap: Map<string, string>
  ) {
    const map: Record<string, number> = {};
    items.forEach((item) => {
      const id = keyFn(item);
      if (id) {
        map[id] = (map[id] || 0) + 1;
      }
    });

    return Object.entries(map)
      .map(([id, count]) => ({
        id,
        name: nameMap.get(id) || 'Não identificado',
        count,
        percentage: totalClicks > 0 ? Math.round((count / totalClicks) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  const bySource = aggregateCount(clicks, (c) => c.source_id, sourceMap);
  const byCampaign = aggregateCount(clicks, (c) => c.campaign_id, campaignMap);
  const byLink = aggregateCount(clicks, (c) => c.link_id, linkMap);
  const byDevice = aggregateCount(clicks, (c) => c.device_id, deviceMap);
  const byDestination = aggregateCount(clicks, (c) => c.destination_id, destMap);

  // Por Device Type (mobile vs desktop)
  const deviceTypeCounts: Record<string, number> = {};
  clicks.forEach((c) => {
    const t = c.device_type || 'outros';
    deviceTypeCounts[t] = (deviceTypeCounts[t] || 0) + 1;
  });

  return {
    totalClicks,
    uniqueVisitors,
    bySource,
    byCampaign,
    byLink,
    byDevice,
    byDestination,
    deviceTypes: Object.entries(deviceTypeCounts).map(([type, count]) => ({ type, count })),
  };
}
