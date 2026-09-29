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

export async function getDestinations() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('destinations')
    .select(`
      *,
      device:devices (
        id,
        name,
        code
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching destinations:', error);
    return [];
  }

  // Buscar última atividade de cada destino
  const destIds = data.map((d) => d.id);
  const { data: recentClicks } = await supabase
    .from('clicks')
    .select('destination_id, created_at')
    .in('destination_id', destIds)
    .order('created_at', { ascending: false });

  const lastActivityMap: Record<string, string> = {};
  const clicksCountMap: Record<string, number> = {};

  recentClicks?.forEach((c) => {
    if (c.destination_id) {
      if (!lastActivityMap[c.destination_id]) {
        lastActivityMap[c.destination_id] = c.created_at;
      }
      clicksCountMap[c.destination_id] = (clicksCountMap[c.destination_id] || 0) + 1;
    }
  });

  return data.map((dest) => ({
    ...dest,
    last_activity: lastActivityMap[dest.id] || null,
    total_clicks: clicksCountMap[dest.id] || 0,
  }));
}

export async function saveDestination(formData: {
  id?: string;
  device_id: string;
  name: string;
  type: 'whatsapp' | 'telegram' | 'website' | 'other';
  url: string;
  phone_number?: string | null;
  weight?: number;
  active?: boolean;
}) {
  const supabase = getSupabase();
  let finalUrl = formData.url.trim();

  // Formatar URL do WhatsApp caso só tenha colocado o telefone
  if (formData.type === 'whatsapp' && formData.phone_number && (!finalUrl || finalUrl === '#')) {
    const clean = formData.phone_number.replace(/\D/g, '');
    finalUrl = `https://wa.me/${clean}`;
  }

  const payload = {
    device_id: formData.device_id,
    name: formData.name.trim(),
    type: formData.type,
    url: finalUrl,
    phone_number: formData.phone_number?.trim() || null,
    weight: Math.max(0, formData.weight ?? 100),
    active: formData.active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (formData.id) {
    const { error } = await supabase.from('destinations').update(payload).eq('id', formData.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('destinations').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/destinations');
  revalidatePath('/admin/devices');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function toggleDestinationActive(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('destinations')
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/destinations');
  return { success: true };
}

export async function deleteDestination(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('destinations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/destinations');
  return { success: true };
}
