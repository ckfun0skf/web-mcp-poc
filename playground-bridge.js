const BASE = 'https://web-mcp-poc-relay.ckfun0skf.workers.dev';
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export function attachBridge(api) {
  const panel = document.createElement('section');
  panel.innerHTML = '<h3>AI 連接</h3><p id="bridge-status" role="status">未連接。先勾選下方允許執行，再按連接。</p><button id="bridge-connect" type="button">連接／更新 token</button><button id="bridge-stop" type="button" disabled>停止 AI 操作</button><label>固定 MCP URL<input id="bridge-url" readonly></label><label>短期配對 token（只貼入 ChatGPT 配對卡片）<input id="bridge-token" type="password" readonly autocomplete="off"></label><button id="bridge-copy" type="button" disabled>複製 token</button><p>ChatGPT：新增固定 URL，無驗證。呼叫 show_pairing_card，模式揀 Tool Playground，貼入 token。之後用 list_browser_tools / call_browser_tool；唔用舊 MCP write_text。停止只能阻止新操作，不能中止已執行 JS。</p>';
  document.querySelector('#workspace h2').after(panel);
  const warning = document.querySelector('.warning');
  warning.textContent = warning.textContent.replace('此輪尚未連接 generic MCP。', '此頁已具 generic MCP 接線；必須主動允許及連接先接受 AI 指令。');
  const status = panel.querySelector('#bridge-status');
  const connect = panel.querySelector('#bridge-connect');
  const stopButton = panel.querySelector('#bridge-stop');
  const tokenField = panel.querySelector('#bridge-token');
  const copy = panel.querySelector('#bridge-copy');
  panel.querySelector('#bridge-url').value = BASE + '/mcp';
  let socket = null, generation = 0, expiry = 0, timer = null, handshake = null, protocolReady = false;
  const completed = new Map(), inFlight = new Set();
  const active = (ws, current) => socket === ws && generation === current;
  const authorized = (ws, current) => active(ws, current) && protocolReady && api.allowed() && expiry > Date.now();
  function halt(reason) {
    generation++; clearTimeout(timer); clearTimeout(handshake);
    const previous = socket; socket = null; protocolReady = false; expiry = 0;
    completed.clear(); inFlight.clear(); tokenField.value = ''; copy.disabled = true;
    connect.disabled = false; stopButton.disabled = true;
    previous?.close(1000, 'User authorization stopped');
    status.textContent = reason; api.log({ event: 'bridge', message: reason });
  }
  function sendResult(ws, current, id, data) {
    if (!active(ws, current) || ws.readyState !== WebSocket.OPEN) return;
    let message = { type: 'registry_result', id, ...data };
    let text = JSON.stringify(message);
    if (text.length > 180000) { message = { type: 'registry_result', id, success: false, error: 'Response exceeds relay frame limit; side effects may already have occurred.' }; text = JSON.stringify(message); }
    completed.set(id, message); if (completed.size > 32) completed.delete(completed.keys().next().value);
    ws.send(text);
  }
  connect.addEventListener('click', async () => {
    if (!api.ready()) { status.textContent = 'Validator 未就緒，禁止連接。'; return; }
    if (!api.allowed()) { status.textContent = '請先勾選允許執行可信 JS。'; return; }
    halt('準備新連線；舊 token 不再指向此頁新連線。已開始嘅 JS 可能仍在運行。');
    const current = ++generation; connect.disabled = true; stopButton.disabled = false; status.textContent = '連接 relay 中…';
    try {
      const key = hex(crypto.getRandomValues(new Uint8Array(32)));
      const control = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))));
      if (generation !== current) return;
      const ws = new WebSocket(BASE.replace('https:', 'wss:') + '/browser?key=' + key);
      socket = ws;
      handshake = setTimeout(() => { if (active(ws, current)) halt('連線／registry handshake 逾時，請確認 Cloudflare 已部署 registry relay。'); }, 12000);
      ws.onmessage = async event => {
        if (!active(ws, current)) return;
        let message;
        try { if (typeof event.data !== 'string' || event.data.length > 180000) throw new Error(); message = JSON.parse(event.data); }
        catch { halt('收到無效或過大訊息，連線已停止。'); return; }
        if (message.type === 'ready') {
          if (!Number.isFinite(message.expiresAt) || message.expiresAt <= Date.now()) { halt('授權已過期。'); return; }
          expiry = message.expiresAt;
          timer = setTimeout(() => { if (active(ws, current)) halt('Browser 授權已過期，請重新連接及配對。'); }, Math.min(3600000, expiry - Date.now()));
          ws.send(JSON.stringify({ type: 'registry_ready', protocol: 1 })); return;
        }
        if (message.type === 'registry_ack') {
          if (!message.supported || !expiry) { halt('Relay 未支援 registry protocol。'); return; }
          protocolReady = true; clearTimeout(handshake); tokenField.value = control; copy.disabled = false; connect.disabled = false;
          status.textContent = '已連接 generic relay；請用配對卡片貼入 token。工具啟停／儲存會更新 registry 版本。';
          api.log({ event: 'bridge_ready', registryVersion: api.getVersion() }); return;
        }
        if (message.type === 'write_text' && typeof message.id === 'string') {
          ws.send(JSON.stringify({ type: 'write_result', id: message.id, success: false }));
          api.log({ event: 'legacy_write_rejected', reason: 'Use call_browser_tool so runtime enable/disable checks apply.' }); return;
        }
        if (!['registry_list', 'registry_call'].includes(message.type) || typeof message.id !== 'string' || message.id.length > 64) return;
        if (!authorized(ws, current)) { sendResult(ws, current, message.id, { success: false, error: 'Browser authorization stopped or expired.' }); return; }
        if (completed.has(message.id)) { ws.send(JSON.stringify(completed.get(message.id))); return; }
        if (inFlight.has(message.id)) return;
        inFlight.add(message.id);
        try {
          if (message.type === 'registry_list') {
            const result = api.list();
            if (JSON.stringify(result.tools).length > 128000) throw new Error('Enabled tool descriptors exceed 128,000 characters; reduce enabled tools/schema size.');
            sendResult(ws, current, message.id, { success: true, result });
            api.log({ event: 'remote_list', registryVersion: result.version, count: result.tools.length });
          } else {
            if (!Number.isSafeInteger(message.registryVersion) || !message.arguments || typeof message.arguments !== 'object' || Array.isArray(message.arguments)) throw new Error('Invalid call request');
            const value = await api.run(message.toolName, message.arguments, message.registryVersion);
            if (!authorized(ws, current)) { api.log({ event: 'late_result_discarded', tool: message.toolName, sideEffectsMayHaveOccurred: true }); return; }
            sendResult(ws, current, message.id, { success: true, result: { version: api.getVersion(), value } });
          }
        } catch (error) { sendResult(ws, current, message.id, { success: false, error: String(error.message || 'Browser execution failed').slice(0, 1500) }); }
        finally { inFlight.delete(message.id); }
      };
      ws.onerror = () => { if (active(ws, current)) status.textContent = 'WebSocket 連線錯誤，請檢查 registry relay 部署。'; };
      ws.onclose = () => { if (active(ws, current)) halt('連線已斷開；重新連接及配對，固定 MCP URL 不變。'); };
    } catch { if (generation === current) halt('建立連線失敗。'); }
  });
  stopButton.addEventListener('click', () => halt('已停止接受新 AI 指令；已開始 JS 不保證停止。'));
  document.querySelector('#trust').addEventListener('change', () => { if (!api.allowed()) halt('已撤銷執行允許；已開始 JS 不保證停止。'); });
  copy.addEventListener('click', async () => {
    if (!tokenField.value) return;
    try { await navigator.clipboard.writeText(tokenField.value); status.textContent = '已複製 token；只貼入配對卡片，勿貼普通對話或公開分享。'; }
    catch { tokenField.type = 'text'; tokenField.select(); status.textContent = '剪貼簿失敗，請手動複製；注意 token 已顯示。'; }
  });
  window.addEventListener('tool-registry-changed', () => { if (protocolReady) status.textContent = 'Registry 已更新至 v' + api.getVersion() + '；AI 應重新 list_browser_tools。無需換 token。'; });
  window.addEventListener('pagehide', () => halt('頁面離開，連線停止。'));
}
