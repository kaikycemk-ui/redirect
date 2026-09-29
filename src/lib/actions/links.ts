'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/database.types';

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(
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
}

export async function getLinks() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('links')
    .select(`
      *,
      source:sources (
        id,
        name,
        slug
      ),
      campaign:campaigns (
        id,
        name,
        slug
      ),
      link_devices:link_devices (
        id,
        weight,
        device:devices (
          id,
          name,
          code,
          active,
          maintenance
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching links:', error);
    return [];
  }

  // Buscar cliques totais e última atividade de cada link
  const linkIds = data.map((l) => l.id);
  const { data: recentClicks } = await supabase
    .from('clicks')
    .select('link_id, created_at')
    .in('link_id', linkIds)
    .order('created_at', { ascending: false });

  const lastActivityMap: Record<string, string> = {};
  const clicksCountMap: Record<string, number> = {};

  recentClicks?.forEach((c) => {
    if (c.link_id) {
      if (!lastActivityMap[c.link_id]) {
        lastActivityMap[c.link_id] = c.created_at;
      }
      clicksCountMap[c.link_id] = (clicksCountMap[c.link_id] || 0) + 1;
    }
  });

  return data.map((link) => ({
    ...link,
    last_activity: lastActivityMap[link.id] || null,
    total_clicks: clicksCountMap[link.id] || 0,
  }));
}

export async function saveLink(formData: {
  id?: string;
  name: string;
  slug: string;
  source_id?: string | null;
  campaign_id?: string | null;
  strategy: 'round_robin' | 'random' | 'weighted';
  destination_strategy: 'round_robin' | 'random' | 'weighted';
  fallback_url?: string | null;
  expires_at?: string | null;
  active?: boolean;
  devices: Array<{ device_id: string; weight: number }>;
}) {
  const supabase = getSupabase();

  const linkPayload = {
    name: formData.name.trim(),
    slug: formData.slug.trim().toLowerCase(),
    source_id: formData.source_id || null,
    campaign_id: formData.campaign_id || null,
    strategy: formData.strategy || 'weighted',
    destination_strategy: formData.destination_strategy || 'weighted',
    fallback_url: formData.fallback_url?.trim() || null,
    expires_at: formData.expires_at || null,
    active: formData.active ?? true,
    updated_at: new Date().toISOString(),
  };

  let linkId = formData.id;

  if (linkId) {
    const { error: updErr } = await supabase.from('links').update(linkPayload).eq('id', linkId);
    if (updErr) throw new Error(updErr.message);

    // Atualizar associações de aparelhos
    await supabase.from('link_devices').delete().eq('link_id', linkId);
  } else {
    const { data: newLink, error: insErr } = await supabase
      .from('links')
      .insert(linkPayload)
      .select('id')
      .single();

    if (insErr || !newLink) throw new Error(insErr?.message || 'Erro ao criar link');
    linkId = newLink.id;
  }

  // Inserir associações link_devices com pesos configurados
  if (formData.devices && formData.devices.length > 0) {
    const linkDevicesPayload = formData.devices.map((d) => ({
      link_id: linkId!,
      device_id: d.device_id,
      weight: Math.max(0, d.weight ?? 100),
    }));

    const { error: ldErr } = await supabase.from('link_devices').insert(linkDevicesPayload);
    if (ldErr) throw new Error(ldErr.message);
  }

  revalidatePath('/admin/links');
  revalidatePath('/admin/dashboard');
  return { success: true, linkId };
}

export async function duplicateLink(id: string) {
  const supabase = getSupabase();
  const { data: original, error: getErr } = await supabase
    .from('links')
    .select(`
      *,
      link_devices:link_devices (
        device_id,
        weight
      )
    `)
    .eq('id', id)
    .single();

  if (getErr || !original) throw new Error('Link não encontrado');

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newSlug = `${original.slug}-copia-${randomSuffix}`;

  const { data: newLink, error: insErr } = await supabase
    .from('links')
    .insert({
      name: `${original.name} (Cópia)`,
      slug: newSlug,
      source_id: original.source_id,
      campaign_id: original.campaign_id,
      strategy: original.strategy,
      destination_strategy: original.destination_strategy,
      fallback_url: original.fallback_url,
      expires_at: original.expires_at,
      active: original.active,
    })
    .select('id')
    .single();

  if (insErr || !newLink) throw new Error(insErr?.message || 'Falha ao duplicar link');

  if (original.link_devices && original.link_devices.length > 0) {
    const devicesToCopy = original.link_devices.map((ld: any) => ({
      link_id: newLink.id,
      device_id: ld.device_id,
      weight: ld.weight,
    }));
    await supabase.from('link_devices').insert(devicesToCopy);
  }

  revalidatePath('/admin/links');
  return { success: true };
}

export async function toggleLinkActive(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('links')
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/links');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function deleteLink(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('links').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/links');
  revalidatePath('/admin/dashboard');
  return { success: true };
}
