import type { OAuthMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import { env } from '../config.js';

/**
 * We are a resource server only — Supabase Auth is the actual OAuth 2.1 authorization
 * server (it hosts /authorize, /token, DCR itself). So instead of re-declaring that
 * metadata by hand (and risking drift), we fetch Supabase's own discovery document at
 * boot and republish it verbatim from our own well-known routes.
 */
export async function fetchSupabaseOAuthMetadata(): Promise<OAuthMetadata> {
  const discoveryUrl = `${env.SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`;
  const res = await fetch(discoveryUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Supabase OAuth metadata from ${discoveryUrl}: ${res.status}`);
  }
  return (await res.json()) as OAuthMetadata;
}
