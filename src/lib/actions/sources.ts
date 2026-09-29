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

export async function getSources() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sources:', error);
    return [];
  }
  return data;
}

export async function saveSource(formData: {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
}) {
  const supabase = getSupabase();
  const payload = {
    name: formData.name.trim(),
    slug: formData.slug.trim().toLowerCase(),
    description: formData.description?.trim() || null,
    active: formData.active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (formData.id) {
    const { error } = await supabase.from('sources').update(payload).eq('id', formData.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('sources').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/sources');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function toggleSourceActive(id: string, currentStatus: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('sources')
    .update({ active: !currentStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/sources');
  return { success: true };
}

export async function deleteSource(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/sources');
  return { success: true };
}
