import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { mcpAuthMetadataRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import cors from 'cors';
import type { Request, Response } from 'express';
import { env } from './config.js';
import { verifyAccessToken } from './auth/jwt.js';
import { fetchSupabaseOAuthMetadata } from './auth/metadata.js';
import { buildMcpServer } from './mcpServer.js';

async function main() {
  const oauthMetadata = await fetchSupabaseOAuthMetadata();

  const resourceServerUrl = new URL('/mcp', env.PUBLIC_SERVER_URL);
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(resourceServerUrl);

  const app = createMcpExpressApp({ host: '0.0.0.0' });

  // Public discovery endpoints — no auth. These just point MCP clients at Supabase,
  // which is the actual OAuth 2.1 authorization server.
  app.use(
    mcpAuthMetadataRouter({
      oauthMetadata,
      resourceServerUrl,
      resourceName: 'carrot-eaters-mcp',
    })
  );

  const auth = requireBearerAuth({
    verifier: { verifyAccessToken },
    resourceMetadataUrl,
  });

  // Some MCP clients call /mcp directly from the browser. A POST carrying an
  // Authorization header + JSON body is a non-simple request, so the browser sends a
  // CORS preflight (OPTIONS) first — this must be answered before the auth middleware
  // ever runs, since preflight requests never carry credentials.
  app.use('/mcp', cors());

  app.post('/mcp', auth, async (req: Request, res: Response) => {
    try {
      const server = buildMcpServer(req.auth!);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        transport.close();
        server.close();
      });
    } catch (err) {
      console.error('Error handling MCP request:', err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  app.get('/mcp', auth, (_req: Request, res: Response) => {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });

  app.delete('/mcp', auth, (_req: Request, res: Response) => {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  app.listen(env.PORT, () => {
    console.log(`carrot-eaters-mcp listening on :${env.PORT}`);
    console.log(`Resource: ${resourceServerUrl.href}`);
    console.log(`Protected resource metadata: ${resourceMetadataUrl}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
