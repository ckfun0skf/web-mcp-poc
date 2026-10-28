'use strict';

(() => {
  const RELAY = 'wss://web-mcp-poc-relay.ckfun0skf.workers.dev/ws';
  const editor = document.querySelector('#editor');
  const status = document.querySelector('#status');
  const connect = document.querySelector('#connect');
  const test = document.querySelector('#test');
  const disconnect = document.querySelector('#disconnect');
  const logElement = document.querySelector('#log');
  let socket = null;
  let pending = null;

  function log(message) {
    const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
    logElement.textContent = [entry, ...logElement.textContent.split('\n')].slice(0, 100).join('\n');
  }

  function resetPending() {
    if (pending) clearTimeout(pending.timer);
    pending = null;
  }

  function writeText({ text, mode }) {
    if (typeof text !== 'string' || text.length > 20000 || mode !== 'replace') {
      throw new Error('無效寫入指令');
    }
    editor.value = text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  connect.addEventListener('click', () => {
    if (socket) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const ws = new WebSocket(`${RELAY}?key=${key}`);
    socket = ws;
    connect.disabled = true;
    disconnect.disabled = false;
    status.textContent = '連接中…';
    log('開始連接 Cloudflare（session key 不會顯示）');

    ws.onmessage = event => {
      if (socket !== ws) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') {
          status.textContent = '已連接 Cloudflare relay';
          test.disabled = false;
          log('收到 relay ready');
        } else if (message.type === 'write_text' && pending && message.id === pending.id) {
          writeText(message);
          resetPending();
          test.disabled = false;
          log('收到 Cloudflare 寫入指令，textarea 已更新；呢次唔係 AI 呼叫');
        } else if (message.type === 'error') {
          resetPending();
          test.disabled = false;
          log('Relay 拒絕測試指令');
        }
      } catch (error) {
        resetPending();
        test.disabled = false;
        log(`錯誤：${error.message}`);
      }
    };

    ws.onerror = () => {
      if (socket === ws) log('連線出錯：檢查 relay 部署及頁面 origin');
    };

    ws.onclose = () => {
      if (socket !== ws) return;
      resetPending();
      socket = null;
      connect.disabled = false;
      test.disabled = true;
      disconnect.disabled = true;
      status.textContent = '已斷開';
      log('WebSocket 已斷開；可重新連接');
    };
  });

  test.addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || pending) return;
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending = null;
      test.disabled = !socket || socket.readyState !== WebSocket.OPEN;
      log('等待 relay 回覆逾時，未執行寫入');
    }, 15000);
    pending = { id, timer };
    test.disabled = true;
    socket.send(JSON.stringify({ type: 'test_write', id }));
    log('測試請求已送出；等待 Cloudflare 指令，未直接修改 textarea');
  });

  disconnect.addEventListener('click', () => {
    if (!socket) return;
    const ws = socket;
    socket = null;
    resetPending();
    ws.close(1000, 'User disconnected');
    connect.disabled = false;
    test.disabled = true;
    disconnect.disabled = true;
    status.textContent = '已斷開';
    log('用戶已斷開；不再接受此連線嘅寫入');
  });

  log('請由 GitHub Pages 開啟此頁；按連接後才建立 WebSocket');
})();
