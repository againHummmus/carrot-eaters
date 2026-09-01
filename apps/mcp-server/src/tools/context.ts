import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseForUser } from '../supabase.js';

export interface ToolContext {
  db: SupabaseClient;
  userId: string;
}

export function buildToolContext(auth: AuthInfo): ToolContext {
  const userId = auth.extra?.sub;
  if (typeof userId !== 'string') {
    throw new Error('Access token has no sub claim');
  }
  return { db: supabaseForUser(auth.token), userId };
}
