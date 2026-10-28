import { DurableObject } from 'cloudflare:workers';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import legacy from './worker.js';
export { BrowserSession } from './worker.js';

const ORIGIN = 'https://ckfun0skf.github.io';
const HEX = /^[a-f0-9]{64}$/;
const failure = message => ({ isError: true, content: [{ type: 'text', text: message }] });
const validArgs = a => a && typeof a.text === 'string' && a.text.length <= 20000 && ['replace', 'append'].includes(a.mode ?? 'replace');

export class AiBrowserSession extends DurableObject {
  pending = new Map();

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/browser' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (request.headers.get('Origin') !== ORIGIN) return new Response('Forbidden', { status: 403 });
      if (this.ctx.getWebSockets().length) return new Response('Already connected', { status: 409 });
      const expiresAt = Date.now() + 3600000;
      await this.ctx.storage.setAlarm(expiresAt);
      const [client, ws] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(ws);
      ws.serializeAttachment({ expiresAt });
      ws.send(JSON.stringify({ type: 'ready', expiresAt }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === '/command' && request.method === 'POST') {
      const args = await request.json();
      if (!validArgs(args)) return Response.json(failure('Invalid write_text arguments'));
      const ws = this.ctx.getWebSockets()[0];
      if (!ws || ws.deserializeAttachment()?.expiresAt <= Date.now()) {
        return Response.json(failure('Browser not connected or session expired. No write performed.'));
      }
      if (this.pending.size) return Response.json(failure('Another write is in progress. Do not retry automatically.'));
      const id = crypto.randomUUID();
      const result = await new Promise(resolve => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          resolve(failure('Browser acknowledgement timed out. Write outcome unknown; do not automatically retry append.'));
        }, 15000);
        this.pending.set(id, { resolve, timer });
        try {
          ws.send(JSON.stringify({ type: 'write_text', id, text: args.text, mode: args.mode ?? 'replace' }));
        } catch {
          this.finish(id, failure('Could not send command to browser.'));
        }
      });
      return Response.json(result);
    }
    return new Response('Not found', { status: 404 });
  }

  finish(id, result) {
    const task = this.pending.get(id);
    if (!task) return;
    clearTimeout(task.timer);
    this.pending.delete(id);
    task.resolve(result);
  }

  webSocketMessage(ws, raw) {
    if (ws.deserializeAttachment()?.expiresAt <= Date.now()) { ws.close(1000, 'Session expired'); return; }
    if (typeof raw !== 'string' || raw.length > 4096) { ws.close(1008, 'Invalid response'); return; }
    try {
      const message = JSON.parse(raw);
      if (message.type !== 'write_result' || typeof message.id !== 'string') return;
      if (message.success === true && Number.isInteger(message.totalLength) && message.totalLength >= 0 && message.totalLength <= 100000) {
        this.finish(message.id, { content: [{ type: 'text', text: JSON.stringify({ success: true, totalLength: message.totalLength, acknowledgedBy: 'browser' }) }] });
      } else {
        this.finish(message.id, failure('Browser rejected the write.'));
      }
    } catch { ws.close(1008, 'Invalid JSON'); }
  }

  webSocketClose(ws) {
    for (const id of this.pending.keys()) this.finish(id, failure('Browser disconnected; write outcome may be unknown.'));
    ws.close(1000, 'Browser disconnected');
  }

  webSocketError(ws) { this.webSocketClose(ws); }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Session expired');
    for (const id of this.pending.keys()) this.finish(id, failure('Session expired.'));
  }
}

async function mcp(request, session) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const server = new Server({ name: 'textarea-poc', version: '0.3.0' }, {
    capabilities: { tools: {} },
    jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{
    name: 'write_text',
    description: 'Write text to the user-authorized open browser textarea. replace overwrites existing text; append adds text. Requires browser acknowledgement. Do not automatically retry failed or timed-out append calls.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', maxLength: 20000 }, mode: { type: 'string', enum: ['replace', 'append'], default: 'replace' } },
      required: ['text'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
  }] }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    if (params.name !== 'write_text' || !validArgs(params.arguments)) return failure('Unknown tool or invalid arguments.');
    const response = await session.fetch(new Request('https://session.internal/command', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params.arguments)
    }));
    if (!response.ok) return failure('Relay command failed.');
    return response.json();
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 32768 });
  await server.connect(transport);
  try { return await transport.handleRequest(request); } finally { await server.close(); }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/browser' && request.method === 'GET') {
      if (request.headers.get('Origin') !== ORIGIN) return new Response('Forbidden', { status: 403 });
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      const key = url.searchParams.get('key') || '';
      if (!HEX.test(key)) return new Response('Invalid key', { status: 400 });
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
      const control = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
      return env.AI_SESSIONS.get(env.AI_SESSIONS.idFromName(control)).fetch(request);
    }
    const match = url.pathname.match(/^\/mcp\/([a-f0-9]{64})$/);
    if (match) {
      const origin = request.headers.get('Origin');
      if (origin && ![ORIGIN, 'https://chatgpt.com'].includes(origin)) return new Response('Forbidden', { status: 403 });
      try {
        return await mcp(request, env.AI_SESSIONS.get(env.AI_SESSIONS.idFromName(match[1])));
      } catch (error) {
        console.error('MCP request failed:', error?.name);
        return Response.json({ error: 'MCP request failed' }, { status: 500 });
      }
    }
    if (url.pathname === '/health' && request.method === 'GET') {
      const response = await legacy.fetch(request, env, ctx);
      if (!response.ok) return response;
      return Response.json({ ...await response.json(), stage: 'mcp-poc', mcpReady: true });
    }
    return legacy.fetch(request, env, ctx);
  }
};
