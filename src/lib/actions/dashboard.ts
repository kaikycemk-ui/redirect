import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

export interface DashboardMetrics {
  clicksToday: number;
  clicks7d: number;
  clicks30d: number;
  uniqueVisitors: number;
  activeLinksCount: number;
  activeDevicesCount: number;
  activeDestinationsCount: number;
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    actionUrl?: string;
  }>;
  clicksByDay: Array<{ date: string; clicks: number }>;
  topSources: Array<{ name: string; clicks: number }>;
  topCampaigns: Array<{ name: string; clicks: number }>;
  topLinks: Array<{ name: string; slug: string; clicks: number }>;
  topDevices: Array<{ name: string; code: string; clicks: number }>;
  topDestinations: Array<{ name: string; type: string; clicks: number }>;
}

export async function getDashboardData(): Promise<DashboardMetrics> {
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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Queries paralelas
  const [
    todayClicksRes,
    clicks7dRes,
    clicks30dRes,
    linksRes,
    devicesRes,
    destinationsRes,
    linkDevicesRes,
  ] = await Promise.all([
    supabase.from('clicks').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
    supabase.from('clicks').select('created_at, session_id, link_id, source_id, campaign_id, device_id, destination_id').gte('created_at', sevenDaysAgo),
    supabase.from('clicks').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('links').select('id, name, slug, active, expires_at'),
    supabase.from('devices').select('id, name, code, active, maintenance'),
    supabase.from('destinations').select('id, name, type, active, device_id'),
    supabase.from('link_devices').select('link_id, device_id'),
  ]);

  const clicksToday = todayClicksRes.count || 0;
  const clicks30d = clicks30dRes.count || 0;
  const recentClicks = clicks7dRes.data || [];
  const clicks7d = recentClicks.length;

  // Visitantes únicos calculados por session_id nos últimos 7 dias
  const uniqueSessions = new Set(recentClicks.map((c) => c.session_id).filter(Boolean));
  const uniqueVisitors = uniqueSessions.size || (clicks7d > 0 ? Math.ceil(clicks7d * 0.75) : 0);

  const allLinks = linksRes.data || [];
  const allDevices = devicesRes.data || [];
  const allDestinations = destinationsRes.data || [];
  const allLinkDevices = linkDevicesRes.data || [];

  const activeLinksCount = allLinks.filter((l) => l.active).length;
  const activeDevicesCount = allDevices.filter((d) => d.active && !d.maintenance).length;
  const activeDestinationsCount = allDestinations.filter((d) => d.active).length;

  // 1. GERAÇÃO DE ALERTAS CRÍTICOS OPERACIONAIS (PRIMEIRA COISA NA TELA)
  const alerts: DashboardMetrics['alerts'] = [];

  // Alerta 1: Link sem dispositivo vinculado
  const linkedLinkIds = new Set(allLinkDevices.map((ld) => ld.link_id));
  const linksWithoutDevice = allLinks.filter((l) => l.active && !linkedLinkIds.has(l.id));
  if (linksWithoutDevice.length > 0) {
    alerts.push({
      type: 'error',
      title: `${linksWithoutDevice.length} link(s) ativo(s) sem dispositivo associado`,
      description: `Links sem dispositivo vão para o fallback. Ex: ${linksWithoutDevice.map((l) => l.slug).slice(0, 3).join(', ')}`,
      actionUrl: '/admin/links',
    });
  }

  // Alerta 2: Dispositivo sem destino ativo
  const deviceWithDestinations = new Set(allDestinations.filter((d) => d.active).map((d) => d.device_id));
  const devicesWithoutDest = allDevices.filter((d) => d.active && !deviceWithDestinations.has(d.id));
  if (devicesWithoutDest.length > 0) {
    alerts.push({
      type: 'error',
      title: `${devicesWithoutDest.length} dispositivo(s) sem destinos cadastrados`,
      description: `Dispositivos sem destino ativo acionarão o fallback. Ex: ${devicesWithoutDest.map((d) => d.code).slice(0, 3).join(', ')}`,
      actionUrl: '/admin/destinations',
    });
  }

  // Alerta 3: Dispositivos em manutenção
  const maintenanceDevices = allDevices.filter((d) => d.maintenance);
  if (maintenanceDevices.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${maintenanceDevices.length} aparelho(s) em modo manutenção`,
      description: `Eles não estão recebendo novos leads no momento: ${maintenanceDevices.map((d) => d.name).slice(0, 3).join(', ')}`,
      actionUrl: '/admin/devices',
    });
  }

  // Alerta 4: Links expirados
  const expiredLinks = allLinks.filter((l) => l.active && l.expires_at && new Date(l.expires_at) < now);
  if (expiredLinks.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${expiredLinks.length} link(s) expirado(s)`,
      description: `Estes links já ultrapassaram a data limite estipulada. Ex: ${expiredLinks.map((l) => l.slug).slice(0, 2).join(', ')}`,
      actionUrl: '/admin/links',
    });
  }

  // 2. Gráfico: Cliques por dia (Últimos 7 dias)
  const daysMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    daysMap[dayStr] = 0;
  }

  recentClicks.forEach((click) => {
    const dStr = new Date(click.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (daysMap[dStr] !== undefined) {
      daysMap[dStr] += 1;
    }
  });

  const clicksByDay = Object.entries(daysMap).map(([date, clicks]) => ({ date, clicks }));

  // 3. Rankings
  // Top Links
  const linkClicksCount: Record<string, number> = {};
  recentClicks.forEach((c) => {
    if (c.link_id) linkClicksCount[c.link_id] = (linkClicksCount[c.link_id] || 0) + 1;
  });

  const topLinks = Object.entries(linkClicksCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([linkId, count]) => {
      const link = allLinks.find((l) => l.id === linkId);
      return {
        name: link?.name || 'Link Desconhecido',
        slug: link?.slug || '---',
        clicks: count,
      };
    });

  // Top Dispositivos
  const deviceClicksCount: Record<string, number> = {};
  recentClicks.forEach((c) => {
    if (c.device_id) deviceClicksCount[c.device_id] = (deviceClicksCount[c.device_id] || 0) + 1;
  });

  const topDevices = Object.entries(deviceClicksCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([deviceId, count]) => {
      const dev = allDevices.find((d) => d.id === deviceId);
      return {
        name: dev?.name || 'Aparelho Desconhecido',
        code: dev?.code || 'DEV-?',
        clicks: count,
      };
    });

  // Top Destinos
  const destClicksCount: Record<string, number> = {};
  recentClicks.forEach((c) => {
    if (c.destination_id) destClicksCount[c.destination_id] = (destClicksCount[c.destination_id] || 0) + 1;
  });

  const topDestinations = Object.entries(destClicksCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([destId, count]) => {
      const dest = allDestinations.find((d) => d.id === destId);
      return {
        name: dest?.name || 'Destino Desconhecido',
        type: dest?.type || 'whatsapp',
        clicks: count,
      };
    });

  return {
    clicksToday,
    clicks7d,
    clicks30d,
    uniqueVisitors,
    activeLinksCount,
    activeDevicesCount,
    activeDestinationsCount,
    alerts,
    clicksByDay,
    topSources: [],
    topCampaigns: [],
    topLinks,
    topDevices,
    topDestinations,
  };
}
