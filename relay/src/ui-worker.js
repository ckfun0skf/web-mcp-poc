import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import legacy, { AiBrowserSession as BaseSession } from './mcp-worker.js';
import { PAIRING_HTML } from './pairing-card.js';
export { BrowserSession } from './worker.js';

const BASE = 'https://web-mcp-poc-relay.ckfun0skf.workers.dev';
const UI = 'ui://textarea/pairing-v1.html';
const MIME = 'text/html;profile=mcp-app';
const HEX = /^[a-f0-9]{64}$/;
const fail = text => ({ isError: true, content: [{ type: 'text', text }] });
const jsonPost = (path, data) => new Request('https://session.internal' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const stub = (env, name) => env.AI_SESSIONS.get(env.AI_SESSIONS.idFromName(name));

// Keep the deployed class name and original browser behavior.
export class AiBrowserSession extends BaseSession {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/pairing-status' && request.method === 'GET') {
      const ws = this.ctx.getWebSockets()[0];
      const expiresAt = ws?.deserializeAttachment()?.expiresAt || 0;
      return Response.json({ connected: Boolean(ws) && expiresAt > Date.now(), expiresAt });
    }
    if (path === '/bind-handle' && request.method === 'POST') {
      const binding = await request.json();
      if (!HEX.test(binding.target) || !Number.isFinite(binding.expiresAt) || binding.expiresAt <= Date.now()) return new Response('Invalid binding', { status: 400 });
      await this.ctx.storage.put('binding', binding);
      await this.ctx.storage.setAlarm(binding.expiresAt);
      return Response.json({ bound: true });
    }
    if (path === '/handle-command' && request.method === 'POST') {
      const binding = await this.ctx.storage.get('binding');
      if (!binding || binding.expiresAt <= Date.now()) return Response.json(fail('PAIRING_EXPIRED: call show_pairing_card and ask the user to pair again.'));
      const response = await stub(this.env, binding.target).fetch(jsonPost('/command', await request.json()));
      return response;
    }
    return super.fetch(request);
  }

  async alarm() {
    if (await this.ctx.storage.get('binding')) { await this.ctx.storage.deleteAll(); return; }
    return super.alarm();
  }
}

function parseToken(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (HEX.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.origin !== BASE || url.search || url.hash) return null;
    return url.pathname.match(/^\/mcp\/([a-f0-9]{64})$/)?.[1] || null;
  } catch { return null; }
}

const tools = [
  { name: 'show_pairing_card', description: 'Show the user a short-lived browser pairing form. Use before writing if no current browser_handle exists, or after a pairing expiry/disconnect error. Ask the user to enter pairing data in the card, not ordinary chat. Never request third-party passwords.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, _meta: { ui: { resourceUri: UI }, 'openai/outputTemplate': UI } },
  { name: 'pair_browser', description: 'Pair a browser using user-entered short-lived data. UI-only helper; not intended for model calls.', inputSchema: { type: 'object', properties: { browser_token: { type: 'string', maxLength: 512 } }, required: ['browser_token'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false }, _meta: { ui: { visibility: ['app'] }, 'openai/widgetAccessible': true } },
  { name: 'write_text', description: 'Write to the paired open textarea. Use the browser_handle explicitly supplied by the user/card in this conversation, never invent or reuse another conversation handle. replace overwrites and append adds. If disconnected or expired, call show_pairing_card. Never automatically retry uncertain append writes.', inputSchema: { type: 'object', properties: { browser_handle: { type: 'string', pattern: '^[a-f0-9]{64}$' }, text: { type: 'string', maxLength: 20000 }, mode: { type: 'string', enum: ['replace', 'append'], default: 'replace' } }, required: ['browser_handle', 'text'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true } }
];

async function serveMcp(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const server = new Server({ name: 'textarea-card-poc', version: '0.4.0' }, { capabilities: { tools: {}, resources: {} }, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: UI, name: 'Browser pairing card', mimeType: MIME }] }));
  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    if (params.uri !== UI) throw new Error('Unknown resource');
    return { contents: [{ uri: UI, mimeType: MIME, text: PAIRING_HTML, _meta: { 'openai/widgetDescription': 'Short-lived browser pairing form. User enters pairing data privately in the card and explicitly shares only a short-lived handle with the model.', 'openai/widgetPrefersBorder': true } }] };
  });
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const args = params.arguments || {};
    if (params.name === 'show_pairing_card') return { content: [{ type: 'text', text: 'Enter the WebApp pairing data in the card, then click Notify AI. Do not paste the original token in ordinary chat.' }], structuredContent: { status: 'awaiting_user_pairing' } };
    if (params.name === 'pair_browser') {
      const target = parseToken(args.browser_token);
      if (!target) return fail('Invalid pairing data.');
      const statusResponse = await stub(env, target).fetch(new Request('https://session.internal/pairing-status'));
      const status = await statusResponse.json();
      if (!status.connected) return fail('Browser disconnected or expired. Open the WebApp and allow AI writing first.');
      const handle = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = Math.min(status.expiresAt, Date.now() + 1800000);
      const response = await stub(env, 'handle:' + handle).fetch(jsonPost('/bind-handle', { target, expiresAt }));
      if (!response.ok) return fail('Could not create pairing handle.');
      return { content: [{ type: 'text', text: 'Browser paired. The UI may explicitly share its temporary handle with the model.' }], structuredContent: { paired: true }, _meta: { handle, expiresAt } };
    }
    if (params.name === 'write_text') {
      if (typeof args.browser_handle !== 'string' || !HEX.test(args.browser_handle) || typeof args.text !== 'string' || args.text.length > 20000 || !['replace', 'append'].includes(args.mode ?? 'replace')) return fail('Invalid write_text arguments.');
      const response = await stub(env, 'handle:' + args.browser_handle).fetch(jsonPost('/handle-command', { text: args.text, mode: args.mode ?? 'replace' }));
      if (!response.ok) return fail('Relay failure.');
      return response.json();
    }
    return fail('Unknown tool.');
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 32768 });
  await server.connect(transport);
  try { return await transport.handleRequest(request); } finally { await server.close(); }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/mcp') {
      const origin = request.headers.get('Origin');
      if (origin && !['https://chatgpt.com', 'https://ckfun0skf.github.io'].includes(origin)) return new Response('Forbidden', { status: 403 });
      try { return await serveMcp(request, env); }
      catch (error) { console.error('Fixed MCP failure:', error?.name); return Response.json({ error: 'MCP request failed' }, { status: 500 }); }
    }
    if (url.pathname === '/health' && request.method === 'GET') {
      const response = await legacy.fetch(request, env, ctx);
      if (!response.ok) return response;
      return Response.json({ ...await response.json(), stage: 'pairing-card-poc', fixedMcpPath: '/mcp', pairingUi: true });
    }
    return legacy.fetch(request, env, ctx);
  }
};
