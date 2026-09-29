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

export async function getSettings() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'general')
    .maybeSingle();

  return (
    (data?.value as {
      operation_name?: string;
      domain?: string;
      global_fallback_url?: string;
      tracking_enabled?: boolean;
      default_strategy?: string;
    }) || {
      operation_name: 'LeadRouter Operation',
      domain: 'localhost:3000',
      global_fallback_url: 'https://google.com',
      tracking_enabled: true,
      default_strategy: 'weighted',
    }
  );
}

export async function saveSettings(settings: {
  operation_name: string;
  domain: string;
  global_fallback_url: string;
  tracking_enabled: boolean;
  default_strategy: string;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('app_settings').upsert({
    key: 'general',
    value: settings as any,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/settings');
  return { success: true };
}
