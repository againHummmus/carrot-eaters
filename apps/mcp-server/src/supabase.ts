import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './config.js';

/**
 * Builds a Postgrest client scoped to the calling user's own access token, so every
 * query runs as that user in Postgres — RLS policies do the actual data isolation,
 * this server never touches the database with elevated privileges.
 */
export function supabaseForUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
