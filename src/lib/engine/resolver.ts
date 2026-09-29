import { createAdminClient } from '@/lib/supabase/admin';
import { selectByWeight, selectRandom, selectByRoundRobin } from './strategies';
import { hashIp, generateAnonymousSessionId, parseUserAgent, sanitizeRedirectUrl } from './tracking';

export interface TrafficResolutionResult {
  success: boolean;
  redirectUrl: string;
  isFallback: boolean;
  fallbackReason?: string;
  details?: {
    linkId?: string;
    sourceId?: string | null;
    campaignId?: string | null;
    deviceId?: string | null;
    destinationId?: string | null;
    linkName?: string;
    deviceName?: string;
    destinationName?: string;
  };
}

export interface ResolveTrafficOptions {
  slug: string;
  ip: string;
  userAgent: string;
  referer?: string;
  isTest?: boolean; // Se for teste de link pelo painel, não grava no banco de cliques!
}

/**
 * Motor central de resolução de tráfego LeadRouter
 * FONTE → CAMPANHA → LINK → DISPOSITIVO → DESTINO → TRACKING
 */
export async function resolveTraffic(options: ResolveTrafficOptions): Promise<TrafficResolutionResult> {
  const { slug, ip, userAgent, referer = '', isTest = false } = options;
  const supabase = createAdminClient();

  // 1. Buscar link e configurações globais em paralelo
  const [linkRes, settingsRes] = await Promise.all([
    supabase
      .from('links')
      .select(`
        id,
        name,
        slug,
        source_id,
        campaign_id,
        strategy,
        destination_strategy,
        fallback_url,
        expires_at,
        active
      `)
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'general')
      .maybeSingle(),
  ]);

  const globalSettings = (settingsRes.data?.value as { global_fallback_url?: string; tracking_enabled?: boolean } | null) || {};
  const globalFallback = sanitizeRedirectUrl(globalSettings.global_fallback_url) || 'https://google.com';

  // Se o link não existe
  if (!linkRes.data) {
    return {
      success: false,
      redirectUrl: globalFallback,
      isFallback: true,
      fallbackReason: 'Link não encontrado',
    };
  }

  const link = linkRes.data;
  const linkFallback = sanitizeRedirectUrl(link.fallback_url) || globalFallback;

  // Se o link está inativo
  if (!link.active) {
    return {
      success: false,
      redirectUrl: linkFallback,
      isFallback: true,
      fallbackReason: 'Link está inativo',
      details: { linkId: link.id, linkName: link.name },
    };
  }

  // Se o link expirou
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return {
      success: false,
      redirectUrl: linkFallback,
      isFallback: true,
      fallbackReason: 'Link expirado',
      details: { linkId: link.id, linkName: link.name },
    };
  }

  // 2. Buscar dispositivos vinculados a este link com status ativo e sem manutenção
  const { data: linkDevices, error: ldError } = await supabase
    .from('link_devices')
    .select(`
      id,
      weight,
      device:devices (
        id,
        name,
        code,
        active,
        maintenance
      )
    `)
    .eq('link_id', link.id);

  if (ldError || !linkDevices || linkDevices.length === 0) {
    return {
      success: false,
      redirectUrl: linkFallback,
      isFallback: true,
      fallbackReason: 'Nenhum dispositivo associado ao link',
      details: { linkId: link.id, linkName: link.name },
    };
  }

  // Filtrar apenas dispositivos ativos e fora de manutenção
  type DeviceItem = {
    id: string;
    name: string;
    weight: number;
  };

  const eligibleDevices: DeviceItem[] = [];

  for (const ld of linkDevices) {
    const dev = ld.device as unknown as { id: string; name: string; active: boolean; maintenance: boolean } | null;
    if (dev && dev.active && !dev.maintenance) {
      eligibleDevices.push({
        id: dev.id,
        name: dev.name,
        weight: ld.weight ?? 100,
      });
    }
  }

  if (eligibleDevices.length === 0) {
    return {
      success: false,
      redirectUrl: linkFallback,
      isFallback: true,
      fallbackReason: 'Todos os dispositivos associados estão inativos ou em manutenção',
      details: { linkId: link.id, linkName: link.name },
    };
  }

  // 3. Selecionar Dispositivo conforme estratégia do Link
  let chosenDevice: DeviceItem | null = null;
  const linkStrategy = link.strategy || 'weighted';

  if (linkStrategy === 'weighted') {
    chosenDevice = selectByWeight(eligibleDevices);
  } else if (linkStrategy === 'random') {
    chosenDevice = selectRandom(eligibleDevices);
  } else if (linkStrategy === 'round_robin') {
    // Round robin com persistência de estado
    const rrKey = `link:${link.id}:device`;
    const { data: stateData } = await supabase
      .from('round_robin_state')
      .select('last_index')
      .eq('entity_key', rrKey)
      .maybeSingle();

    const lastIdx = stateData?.last_index ?? -1;
    const result = selectByRoundRobin(eligibleDevices, lastIdx);
    if (result) {
      chosenDevice = result.item;
      // Aguarda salvar o índice (em serverless, promessas soltas podem ser abortadas)
      await supabase
        .from('round_robin_state')
        .upsert({ entity_key: rrKey, last_index: result.nextIndex, updated_at: new Date().toISOString() });
    }
  }

  if (!chosenDevice) {
    chosenDevice = eligibleDevices[0];
  }

  // 4. Buscar destinos vinculados a este dispositivo
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select(`
      id,
      name,
      type,
      url,
      phone_number,
      weight,
      active
    `)
    .eq('device_id', chosenDevice.id)
    .eq('active', true);

  if (destError || !destinations || destinations.length === 0) {
    return {
      success: false,
      redirectUrl: linkFallback,
      isFallback: true,
      fallbackReason: `Dispositivo (${chosenDevice.name}) não possui destinos ativos`,
      details: { linkId: link.id, deviceId: chosenDevice.id, deviceName: chosenDevice.name },
    };
  }

  // 5. Selecionar Destino dentro do Dispositivo escolhido
  const destStrategy = link.destination_strategy || 'weighted';
  let chosenDest: (typeof destinations)[0] | null = null;

  if (destStrategy === 'weighted') {
    chosenDest = selectByWeight(destinations);
  } else if (destStrategy === 'random') {
    chosenDest = selectRandom(destinations);
  } else if (destStrategy === 'round_robin') {
    const rrDestKey = `device:${chosenDevice.id}:destination`;
    const { data: stateData } = await supabase
      .from('round_robin_state')
      .select('last_index')
      .eq('entity_key', rrDestKey)
      .maybeSingle();

    const lastIdx = stateData?.last_index ?? -1;
    const result = selectByRoundRobin(destinations, lastIdx);
    if (result) {
      chosenDest = result.item;
      await supabase
        .from('round_robin_state')
        .upsert({ entity_key: rrDestKey, last_index: result.nextIndex, updated_at: new Date().toISOString() });
    }
  }

  if (!chosenDest) {
    chosenDest = destinations[0];
  }

  // Formatar URL final segura
  let finalUrl = chosenDest.url;
  // Se for WhatsApp com número e sem url completa formatada
  if (chosenDest.type === 'whatsapp' && chosenDest.phone_number && (!finalUrl || finalUrl === '#')) {
    const cleanPhone = chosenDest.phone_number.replace(/\D/g, '');
    finalUrl = `https://wa.me/${cleanPhone}`;
  }

  const sanitizedFinalUrl = sanitizeRedirectUrl(finalUrl) || linkFallback;

  // 6. Gravação de Tracking (Assíncrona para não atrasar o redirect)
  if (!isTest && globalSettings.tracking_enabled !== false) {
    const ipHash = hashIp(ip);
    const sessionId = generateAnonymousSessionId(ipHash, userAgent);
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Aguarda a gravação: em serverless (Netlify) promessas soltas podem ser abortadas
    const { error } = await supabase
      .from('clicks')
      .insert({
        link_id: link.id,
        source_id: link.source_id,
        campaign_id: link.campaign_id,
        device_id: chosenDevice.id,
        destination_id: chosenDest.id,
        session_id: sessionId,
        ip_hash: ipHash,
        user_agent: userAgent?.substring(0, 500) || null,
        referer: referer?.substring(0, 500) || null,
        device_type: deviceType,
        browser,
        os,
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.error('[LeadRouter Tracking Error]:', error.message);
    }
  }

  return {
    success: true,
    redirectUrl: sanitizedFinalUrl,
    isFallback: false,
    details: {
      linkId: link.id,
      linkName: link.name,
      sourceId: link.source_id,
      campaignId: link.campaign_id,
      deviceId: chosenDevice.id,
      deviceName: chosenDevice.name,
      destinationId: chosenDest.id,
      destinationName: chosenDest.name,
    },
  };
}
