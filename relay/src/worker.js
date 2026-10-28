import { DurableObject } from 'cloudflare:workers';

export class BrowserSession extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ durableObject: 'ok' });
    }
    return new Response('Not found', { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        const id = env.BROWSER_SESSIONS.idFromName('health-check');
        const response = await env.BROWSER_SESSIONS.get(id).fetch(
          new Request('https://session.internal/health')
        );
        if (!response.ok) throw new Error('Health check failed');
        const result = await response.json();
        return Response.json({
          service: 'web-mcp-poc-relay',
          stage: 'infrastructure-only',
          worker: 'ok',
          durableObject: result.durableObject,
          mcpReady: false
        });
      } catch (error) {
        console.error('Durable Object health check failed', error);
        return Response.json({ error: 'Durable Object unavailable' }, { status: 503 });
      }
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('Relay scaffold deployed. Open /health. MCP and WebSocket are not implemented yet.');
    }
    return new Response('Not found', { status: 404 });
  }
};
