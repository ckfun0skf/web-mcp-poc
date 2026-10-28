export function attachNativeWebMCP(api) {
  const panel = document.createElement('section');
  const heading = document.createElement('h3'); heading.textContent = '原生 WebMCP';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  panel.append(heading, status); document.querySelector('#workspace h2').after(panel);
  const context = document.modelContext;
  const supported = Boolean(window.isSecureContext && context && typeof context.registerTool === 'function');
  let epoch = 0, disposed = false;
  let registrations = [];
  let queue = Promise.resolve();
  function clear() { for (const controller of registrations) controller.abort(); registrations = []; }
  async function synchronize(expected) {
    if (expected !== epoch || disposed) return;
    clear();
    if (!supported) { status.textContent = '此瀏覽器未提供 document.modelContext.registerTool；原生 WebMCP 不可用。現有 WebSocket／本地測試仍可使用。'; return; }
    if (!api.ready()) { status.textContent = '驗證器未就緒，未公開 WebMCP 工具。'; return; }
    if (!api.allowed()) { status.textContent = '已支援原生 WebMCP；勾選允許執行可信工具後先公開工具。'; return; }
    const snapshot = api.list();
    let count = 0;
    try {
      for (const descriptor of snapshot.tools) {
        if (expected !== epoch || disposed || !api.allowed()) { clear(); return; }
        const controller = new AbortController(); registrations.push(controller);
        const annotations = {};
        for (const key of ['readOnlyHint', 'consequentialHint', 'untrustedContentHint', 'debugging']) {
          if (typeof descriptor.annotations?.[key] === 'boolean') annotations[key] = descriptor.annotations[key];
        }
        if (descriptor.annotations?.destructiveHint === true) annotations.consequentialHint = true;
        await context.registerTool({
          name: descriptor.name, description: descriptor.description, inputSchema: descriptor.inputSchema, annotations,
          async execute(args, options = {}) {
            const signal = options.signal;
            signal?.throwIfAborted();
            if (controller.signal.aborted || expected !== epoch || disposed || !api.allowed()) return { error: 'TOOL_UNAVAILABLE', message: '工具已更新、停用或執行授權已撤銷。請重新查詢工具。' };
            api.log({ event: 'native_webmcp_call', tool: descriptor.name, registryVersion: snapshot.version });
            try {
              const value = await api.run(descriptor.name, args, snapshot.version);
              signal?.throwIfAborted();
              return value;
            } catch (error) {
              if (signal?.aborted) throw error;
              return { error: 'PLAYGROUND_TOOL_FAILED', message: String(error.message || error).slice(0, 1500), sideEffectsMayHaveOccurred: true };
            }
          }
        }, { signal: controller.signal });
        if (expected !== epoch || disposed || !api.allowed()) { clear(); return; }
        count++;
      }
      status.textContent = '原生 WebMCP 已公開 ' + count + ' 個工具 · registry v' + snapshot.version + '。不需要 Cloudflare 連線。';
      api.log({ event: 'native_webmcp_registered', count, registryVersion: snapshot.version });
    } catch (error) {
      clear();
      if (expected === epoch && !disposed) {
        status.textContent = 'WebMCP 註冊失敗；此模組已移除本輪工具：' + String(error.message || error).slice(0, 500) + '。WebSocket 測試路徑保留。';
        api.log({ event: 'native_webmcp_registration_error', message: String(error.message || error).slice(0, 500) });
      }
    }
  }
  function refresh() {
    const expected = ++epoch; clear();
    queue = queue.then(() => synchronize(expected)).catch(error => { clear(); status.textContent = 'WebMCP 同步失敗：' + String(error.message || error).slice(0, 500); });
  }
  window.addEventListener('tool-registry-changed', refresh);
  document.querySelector('#trust').addEventListener('change', refresh);
  window.addEventListener('pagehide', () => { disposed = true; epoch++; clear(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { disposed = false; refresh(); } });
  refresh();
}
