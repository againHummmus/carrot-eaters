import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from '@kbju/shared';

export async function requireUser(redirectTo = '/login') {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(redirectTo);
  return { supabase, userId: claims.sub as string };
}

export async function fetchProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}
