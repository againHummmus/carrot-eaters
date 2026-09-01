import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { env } from '../config.js';

const issuer = `${env.SUPABASE_URL}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

/**
 * Validates a Supabase-issued access token (obtained by the MCP client via Supabase's
 * own OAuth 2.1 server) against the project's JWKS. We don't run any OAuth flow
 * ourselves — Supabase is the full authorization server, this is just verification.
 */
export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const { payload } = await jwtVerify(token, jwks, { issuer });

  if (typeof payload.sub !== 'string') {
    throw new Error('Token is missing a sub (user id) claim');
  }

  return {
    token,
    clientId: typeof payload.client_id === 'string' ? payload.client_id : '',
    scopes: [],
    expiresAt: payload.exp,
    extra: {
      sub: payload.sub,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    },
  };
}
