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

export async function getCampaigns() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      source:sources (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }
  return data;
}

export async function saveCampaign(formData: {
  id?: string;
  name: string;
  slug: string;
  source_id?: string | null;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  active?: boolean;
}) {
  const supabase = getSupabase();
  const payload = {
    name: formData.name.trim(),
    slug: formData.slug.trim().toLowerCase(),
    source_id: formData.source_id || null,
    description: formData.description?.trim() || null,
    start_at: formData.start_at || null,
    end_at: formData.end_at || null,
    active: formData.active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (formData.id) {
    const { error } = await supabase.from('campaigns').update(payload).eq('id', formData.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('campaigns').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/campaigns');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function duplicateCampaign(id: string) {
  const supabase = getSupabase();
  const { data: original, error: getErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (getErr || !original) throw new Error('Campanha não encontrada para duplicação');

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newSlug = `${original.slug}-copia-${randomSuffix}`;

  const { error: insErr } = await supabase.from('campaigns').insert({
    name: `${original.name} (Cópia)`,
    slug: newSlug,
    source_id: original.source_id,
    description: original.description,
    start_at: original.start_at,
    end_at: original.end_at,
    active: original.active,
  });

  if (insErr) throw new Error(insErr.message);
  revalidatePath('/admin/campaigns');
  return { success: true };
}

export async function toggleCampaignActive(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('campaigns')
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/campaigns');
  return { success: true };
}

export async function deleteCampaign(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/campaigns');
  return { success: true };
}
