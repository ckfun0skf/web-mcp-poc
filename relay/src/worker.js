import { DurableObject } from 'cloudflare:workers';

const ALLOWED_ORIGIN = 'https://ckfun0skf.github.io';

export class BrowserSession extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ durableObject: 'ok' });
    }
    if (url.pathname === '/ws' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
        return new Response('Forbidden', { status: 403 });
      }
      if (this.ctx.getWebSockets().length >= 1) {
        return new Response('Session already connected', { status: 409 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'ready' }));
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) {
      ws.close(1008, 'Invalid message');
      return;
    }
    try {
      const message = JSON.parse(raw);
      if (message.type !== 'test_write' || typeof message.id !== 'string' || message.id.length > 64) {
        throw new Error('Unsupported message');
      }
      ws.send(JSON.stringify({
        type: 'write_text',
        id: message.id,
        text: `Cloudflare relay 往返測試成功！\n伺服器時間：${new Date().toISOString()}`,
        mode: 'replace'
      }));
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid test request' }));
    }
  }

  webSocketClose(ws, code, reason) {
    ws.close(code, reason);
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
          stage: 'websocket-test',
          worker: 'ok',
          durableObject: result.durableObject,
          mcpReady: false
        });
      } catch (error) {
        console.error('Durable Object health check failed', error);
        return Response.json({ error: 'Durable Object unavailable' }, { status: 503 });
      }
    }
    if (request.method === 'GET' && url.pathname === '/ws') {
      if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
        return new Response('Forbidden', { status: 403 });
      }
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('WebSocket required', { status: 426 });
      }
      const key = url.searchParams.get('key') || '';
      if (!/^[a-f0-9]{64}$/.test(key)) {
        return new Response('Invalid session key', { status: 400 });
      }
      const id = env.BROWSER_SESSIONS.idFromName(`test:${key}`);
      return env.BROWSER_SESSIONS.get(id).fetch(request);
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('WebSocket test relay. Open /health. MCP is not implemented yet.');
    }
    return new Response('Not found', { status: 404 });
  }
};
