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

export async function getDevices() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      destinations:destinations (
        id,
        name,
        type,
        active,
        weight
      ),
      link_devices:link_devices (
        id,
        link:links (
          id,
          name,
          slug
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching devices:', error);
    return [];
  }

  // Buscar última atividade de cada aparelho
  const deviceIds = data.map((d) => d.id);
  const { data: recentClicks } = await supabase
    .from('clicks')
    .select('device_id, created_at')
    .in('device_id', deviceIds)
    .order('created_at', { ascending: false });

  const lastActivityMap: Record<string, string> = {};
  const clicksCountMap: Record<string, number> = {};

  recentClicks?.forEach((c) => {
    if (c.device_id) {
      if (!lastActivityMap[c.device_id]) {
        lastActivityMap[c.device_id] = c.created_at;
      }
      clicksCountMap[c.device_id] = (clicksCountMap[c.device_id] || 0) + 1;
    }
  });

  return data.map((dev) => ({
    ...dev,
    last_activity: lastActivityMap[dev.id] || null,
    total_clicks: clicksCountMap[dev.id] || 0,
  }));
}

export async function saveDevice(formData: {
  id?: string;
  name: string;
  code: string;
  model?: string;
  description?: string;
  active?: boolean;
  maintenance?: boolean;
}) {
  const supabase = getSupabase();
  const payload = {
    name: formData.name.trim(),
    code: formData.code.trim().toUpperCase(),
    model: formData.model?.trim() || null,
    description: formData.description?.trim() || null,
    active: formData.active ?? true,
    maintenance: formData.maintenance ?? false,
    updated_at: new Date().toISOString(),
  };

  if (formData.id) {
    const { error } = await supabase.from('devices').update(payload).eq('id', formData.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('devices').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/devices');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function toggleDeviceMaintenance(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('devices')
    .update({ maintenance: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/devices');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function toggleDeviceActive(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('devices')
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/devices');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function deleteDevice(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/devices');
  return { success: true };
}
