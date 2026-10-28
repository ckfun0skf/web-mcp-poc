import { attachBridge } from './playground-bridge.js';
const $ = id => document.getElementById(id);
const KEY = 'web-mcp-poc.tool-playground.v1';
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const clone = value => JSON.parse(JSON.stringify(value));
let Validator;
try { ({ Validator } = await import('https://esm.sh/@cfworker/json-schema@4.1.1?bundle')); }
catch { $('status').textContent = 'Schema validator 載入失敗；可查看工具，但驗證／儲存／執行會停止。請確認網絡及 CDN 可用。'; }
let tools = [], selected = null, dirty = false, version = 1, running = false;
const logs = [];
function report(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
function log(event) { logs.unshift({ time: new Date().toISOString(), ...event }); logs.splice(100); $('log').textContent = logs.map(x => JSON.stringify(x, null, 2)).join('\n'); }
function guard(fn) { return async (...args) => { try { await fn(...args); } catch (error) { report(error.message, true); } }; }
function requireValidator() { if (!Validator) throw new Error('Schema validator 未載入，操作已停止'); }
function checkRefs(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['$ref', '$dynamicRef'].includes(key) && typeof child === 'string' && !child.startsWith('#')) throw new Error('此 PoC 只接受文件內 fragment $ref／$dynamicRef');
    checkRefs(child);
  }
}
function prepareSchema(schema, input = false) {
  requireValidator();
  if (input && (!schema || typeof schema !== 'object' || Array.isArray(schema) || schema.type !== 'object')) throw new Error('inputSchema 最外層必須係 type: object');
  if (typeof schema !== 'boolean' && (!schema || typeof schema !== 'object' || Array.isArray(schema))) throw new Error('Schema 必須係 object 或 boolean');
  if (JSON.stringify(schema).length > 32000) throw new Error('Schema 超過 32,000 字元限制');
  checkRefs(schema);
  return new Validator(schema, '2020-12', false);
}
function validateValue(schema, value) {
  const result = prepareSchema(schema).validate(value);
  if (!result.valid) throw new Error('Schema validation failed: ' + JSON.stringify(result.errors).slice(0, 2500));
}
function normalize(value) {
  if (!value || typeof value !== 'object') throw new Error('無效工具');
  const name = String(value.name || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(name)) throw new Error('Name 須為 1–64 個英文字母／數字／_／-，開頭不可係數字或 -');
  if (typeof value.description !== 'string' || !value.description.trim() || value.description.length > 4000) throw new Error('Description 必填，最多 4,000 字元');
  const inputSchema = clone(value.inputSchema);
  prepareSchema(inputSchema, true);
  if (typeof value.code !== 'string' || value.code.length > 20000) throw new Error('JS 最多 20,000 字元');
  new AsyncFunction('args', 'app', '"use strict";\n' + value.code);
  const annotations = value.annotations ?? {};
  if (!annotations || typeof annotations !== 'object' || Array.isArray(annotations)) throw new Error('annotations 必須係 JSON object');
  for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
    if (key in annotations && typeof annotations[key] !== 'boolean') throw new Error(key + ' 必須係 boolean');
  }
  const tool = { id: typeof value.id === 'string' ? value.id : crypto.randomUUID(), name, description: value.description, enabled: value.enabled === true, inputSchema, code: value.code, annotations: clone(annotations) };
  if (value.title) tool.title = String(value.title).slice(0, 200);
  if (value.outputSchema !== undefined) { tool.outputSchema = clone(value.outputSchema); prepareSchema(tool.outputSchema); }
  return tool;
}
function defaults() {
  const empty = { type: 'object', properties: {}, additionalProperties: false };
  const text = { type: 'object', properties: { text: { type: 'string', description: '要寫入嘅文字', maxLength: 20000 } }, required: ['text'], additionalProperties: false };
  return [
    { name: 'read_text', description: '讀取 Workspace textarea 內容。內容將交畀呼叫者。', inputSchema: empty, code: 'return { text: app.getText() };', annotations: { readOnlyHint: true } },
    { name: 'write_text', description: '覆寫 Workspace textarea 全部內容。', inputSchema: text, code: 'app.setText(args.text);\nreturn { success: true, length: app.getText().length };', annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true } },
    { name: 'append_text', description: '將文字追加到 Workspace textarea，唔自動加換行。', inputSchema: text, code: 'app.appendText(args.text);\nreturn { success: true, length: app.getText().length };', annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
    { name: 'clear_text', description: '清空 Workspace textarea。', inputSchema: empty, code: 'app.setText("");\nreturn { success: true };', annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true } }
  ].map(t => ({ ...clone(t), id: crypto.randomUUID(), enabled: true }));
}
function snapshot() { return tools.filter(t => t.enabled).map(({ code, id, enabled, ...descriptor }) => clone(descriptor)); }
function commit(next) {
  if (next.length > 50) throw new Error('最多 50 個工具');
  const normalized = next.map(normalize);
  if (new Set(normalized.map(t => t.name)).size !== normalized.length) throw new Error('工具名稱不可重複');
  if (new Set(normalized.map(t => t.id)).size !== normalized.length) throw new Error('工具 ID 不可重複');
  const data = JSON.stringify({ format: 1, tools: normalized });
  if (data.length > 500000) throw new Error('工具設定超過 500,000 字元限制');
  localStorage.setItem(KEY, data);
  tools = normalized; version++; renderList();
  window.dispatchEvent(new CustomEvent('tool-registry-changed', { detail: { version, tools: snapshot() } }));
  report('已保存。Registry v' + version + '；AI 下次查詢會取得目前啟用工具，舊版本呼叫會被拒絕。');
}
function markDirty() { dirty = true; $('draft-status').textContent = '有未儲存修改；測試只會執行已儲存版本'; }
function canLeave() { return !dirty || confirm('放棄目前未儲存嘅修改？'); }
function renderList() {
  $('tool-list').replaceChildren();
  $('registry-status').textContent = tools.filter(t => t.enabled).length + '/' + tools.length + ' enabled · v' + version;
  for (const tool of tools) {
    const row = document.createElement('div'); row.className = 'tool';
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = tool.enabled; enabled.setAttribute('aria-label', 'Enable ' + tool.name);
    enabled.addEventListener('change', guard(() => { commit(tools.map(t => t.id === tool.id ? { ...t, enabled: enabled.checked } : t)); if (selected === tool.id) $('enabled').checked = enabled.checked; }));
    const select = document.createElement('button'); select.type = 'button'; select.textContent = (tool.id === selected ? '▶ ' : '') + tool.name;
    select.addEventListener('click', () => { if (canLeave()) load(tool.id); });
    row.append(enabled, select); $('tool-list').append(row);
  }
}
function load(id) {
  const tool = tools.find(t => t.id === id); selected = tool?.id ?? null; dirty = false;
  const draft = tool ?? { name: '', description: '', enabled: false, inputSchema: { type: 'object', properties: {}, additionalProperties: false }, code: 'return { success: true };', annotations: {} };
  for (const field of ['name', 'description', 'code']) $(field).value = draft[field];
  $('enabled').checked = draft.enabled; $('title').value = draft.title || '';
  $('schema').value = JSON.stringify(draft.inputSchema, null, 2);
  $('output-schema').value = draft.outputSchema === undefined ? '' : JSON.stringify(draft.outputSchema, null, 2);
  $('annotations').value = JSON.stringify(draft.annotations ?? {}, null, 2);
  $('draft-status').textContent = tool ? '編輯：' + tool.name : '新增工具（未保存）';
  $('test-result').textContent = ''; renderList(); renderParameters();
}
function readDraft() {
  const output = $('output-schema').value.trim();
  return normalize({ id: selected ?? crypto.randomUUID(), name: $('name').value, description: $('description').value, enabled: $('enabled').checked, title: $('title').value, inputSchema: JSON.parse($('schema').value), code: $('code').value, annotations: JSON.parse($('annotations').value || '{}'), ...(output ? { outputSchema: JSON.parse(output) } : {}) });
}
function changeSchema(fn) {
  const schema = JSON.parse($('schema').value);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('Schema 必須係 object');
  fn(schema); $('schema').value = JSON.stringify(schema, null, 2); markDirty(); renderParameters();
}
function node(tag, text) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; return element; }
function field(label, element) { const container = node('label', label); container.append(element); return container; }
function renderParameters() {
  $('parameters').replaceChildren();
  let schema; try { schema = JSON.parse($('schema').value); } catch { $('parameters').textContent = '原始 JSON 未完成；修正後離開欄位以刷新表單。'; return; }
  const properties = schema?.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return;
  for (const [name, property] of Object.entries(properties)) {
    const row = node('div'); row.className = 'parameter';
    const rename = node('input'); rename.value = name;
    rename.addEventListener('change', guard(() => changeSchema(s => {
      const next = rename.value.trim();
      if (!next || (next !== name && Object.hasOwn(s.properties, next))) throw new Error('參數名稱不可空白或重複');
      s.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k === name ? next : k, v]));
      if (Array.isArray(s.required)) s.required = s.required.map(k => k === name ? next : k);
    })));
    const type = node('select');
    for (const value of ['', 'string', 'number', 'integer', 'boolean', 'object', 'array', 'null']) { const option = node('option', value || '進階／union'); option.value = value; type.append(option); }
    type.value = typeof property?.type === 'string' ? property.type : '';
    type.addEventListener('change', guard(() => changeSchema(s => {
      const p = s.properties[name];
      if (!p || typeof p !== 'object') throw new Error('請先用進階 JSON 將 boolean schema 改為 object');
      if (type.value) p.type = type.value; else delete p.type;
    })));
    const required = node('input'); required.type = 'checkbox'; required.checked = Array.isArray(schema.required) && schema.required.includes(name);
    required.addEventListener('change', guard(() => changeSchema(s => { const items = new Set(Array.isArray(s.required) ? s.required : []); if (required.checked) items.add(name); else items.delete(name); s.required = [...items]; })));
    const top = node('div'); top.className = 'row'; top.append(field('Name', rename), field('Type', type), field('Required', required)); row.append(top);
    const description = node('input'); description.value = property?.description || '';
    description.addEventListener('change', guard(() => changeSchema(s => { if (!s.properties[name] || typeof s.properties[name] !== 'object') throw new Error('此參數使用 boolean schema'); s.properties[name].description = description.value; })));
    row.append(field('Description', description));
    const advanced = node('textarea'); advanced.value = JSON.stringify(property, null, 2);
    advanced.addEventListener('change', guard(() => changeSchema(s => { s.properties = Object.fromEntries(Object.entries(s.properties).map(([k,v]) => [k, k === name ? JSON.parse(advanced.value) : v])); })));
    const details = node('details'); details.append(node('summary', '完整參數 Schema：default／enum／items／properties／oneOf 等'), advanced); row.append(details);
    const remove = node('button', '刪除此參數'); remove.type = 'button';
    remove.addEventListener('click', guard(() => changeSchema(s => { delete s.properties[name]; if (Array.isArray(s.required)) s.required = s.required.filter(k => k !== name); }))); row.append(remove); $('parameters').append(row);
  }
}
const app = Object.freeze({
  getText: () => $('workspace-text').value,
  setText(text) { if (typeof text !== 'string' || text.length > 100000) throw new Error('文字必須係字串，最多 100,000 UTF-16 code units'); $('workspace-text').value = text; $('workspace-text').dispatchEvent(new Event('input', { bubbles: true })); },
  appendText(text) { if (typeof text !== 'string') throw new Error('text 必須係字串'); app.setText(app.getText() + text); },
  log(value) { log({ source: 'user-js', value: clone(value ?? null) }); },
  getTools: () => clone(tools),
  registerTool(definition) { const existing = tools.find(t => t.name === definition.name); const tool = normalize({ ...definition, id: existing?.id ?? crypto.randomUUID() }); commit(existing ? tools.map(t => t.id === existing.id ? tool : t) : [...tools, tool]); return { name: tool.name, version }; },
  removeTool(name) { if (!tools.some(t => t.name === name)) throw new Error('工具不存在'); commit(tools.filter(t => t.name !== name)); },
  setToolEnabled(name, enabled) { if (typeof enabled !== 'boolean' || !tools.some(t => t.name === name)) throw new Error('無效工具或 enabled'); commit(tools.map(t => t.name === name ? { ...t, enabled } : t)); }
});
async function execute(name, args) {
  if (!$('trust').checked) throw new Error('請先喺 Workspace 勾選允許執行可信工具');
  if (running) throw new Error('已有工具執行中；逾時後不保證背景程式已停止');
  const current = tools.find(t => t.name === name);
  if (!current?.enabled) throw new Error('工具不存在或已停用');
  const tool = clone(current); validateValue(tool.inputSchema, args);
  const started = performance.now(); running = true; let timer;
  log({ event: 'start', tool: name, version, args: clone(args) });
  try {
    const fn = new AsyncFunction('args', 'app', '"use strict";\n' + tool.code);
    const result = await Promise.race([fn(clone(args), app), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('10 秒等待逾時：JS 可能仍然運行，副作用不可回滾，請勿自動重試')), 10000); })]);
    const output = clone(result === undefined ? null : result);
    if (JSON.stringify(output).length > 64000) throw new Error('回傳結果超過 64,000 字元；JS 副作用可能已發生');
    if (tool.outputSchema !== undefined) validateValue(tool.outputSchema, output);
    log({ event: 'success', tool: name, elapsedMs: Math.round(performance.now() - started), output }); return output;
  } catch (error) { log({ event: 'error', tool: name, elapsedMs: Math.round(performance.now() - started), message: error.message, sideEffectsMayHaveOccurred: true }); throw error; }
  finally { clearTimeout(timer); running = false; }
}
for (const tab of ['workspace', 'tools']) $('tab-' + tab).addEventListener('click', () => { $('workspace').hidden = tab !== 'workspace'; $('tools-panel').hidden = tab !== 'tools'; $('tab-workspace').setAttribute('aria-pressed', String(tab === 'workspace')); $('tab-tools').setAttribute('aria-pressed', String(tab === 'tools')); });
for (const id of ['name', 'description', 'enabled', 'title', 'schema', 'code', 'output-schema', 'annotations']) $(id).addEventListener('input', markDirty);
$('schema').addEventListener('change', renderParameters);
$('new').addEventListener('click', () => { if (canLeave()) load(null); });
$('save').addEventListener('click', guard(() => { const tool = readDraft(); commit(selected ? tools.map(t => t.id === selected ? tool : t) : [...tools, tool]); load(tool.id); }));
$('validate').addEventListener('click', guard(() => { readDraft(); report('草稿基本結構、Schema 初始化及 JS 語法檢查通過；尚未執行，唔代表所有 Schema 語義或行為已驗證。'); }));
$('add-parameter').addEventListener('click', guard(() => changeSchema(s => { s.properties ??= {}; let n = 1; while (Object.hasOwn(s.properties, 'param' + n)) n++; s.properties = { ...s.properties, ['param' + n]: { type: 'string', description: '' } }; })));
$('duplicate').addEventListener('click', guard(() => { if (!canLeave()) return; const tool = tools.find(t => t.id === selected); if (!tool) throw new Error('請先選擇已儲存工具'); let name = tool.name.slice(0, 50) + '_copy', i = 1; while (tools.some(t => t.name === name)) name = tool.name.slice(0, 48) + '_copy' + i++; const copy = { ...clone(tool), id: crypto.randomUUID(), name, enabled: false }; commit([...tools, copy]); load(copy.id); }));
$('delete').addEventListener('click', guard(() => { if (!selected || !confirm('刪除此工具及目前草稿？')) return; commit(tools.filter(t => t.id !== selected)); load(tools[0]?.id ?? null); }));
$('reset').addEventListener('click', guard(() => { if (!confirm('以四個預設工具取代全部工具及草稿？建議先匯出。')) return; commit(defaults()); load(tools[0].id); }));
$('run').addEventListener('click', guard(async () => { if (dirty || !selected) throw new Error('請先儲存工具，再測試'); const tool = tools.find(t => t.id === selected); $('run').disabled = true; try { const output = await execute(tool.name, JSON.parse($('arguments').value)); $('test-result').textContent = JSON.stringify(output, null, 2); report('本地測試成功；未經 AI 或 relay。'); } catch (error) { $('test-result').textContent = error.message; throw error; } finally { $('run').disabled = false; } }));
$('clear-log').addEventListener('click', () => { logs.length = 0; $('log').textContent = ''; });
$('export').addEventListener('click', guard(() => { const blob = new Blob([JSON.stringify({ format: 1, tools }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'tool-playground.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); report('已匯出工具設定及 JS；冇匯出 textarea、token 或執行紀錄。'); }));
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', guard(async event => { const file = event.target.files[0]; event.target.value = ''; if (!file) return; if (file.size > 1000000) throw new Error('匯入檔案最多 1 MB'); const data = JSON.parse(await file.text()); if (data.format !== 1 || !Array.isArray(data.tools)) throw new Error('匯入格式錯誤'); const next = data.tools.map(t => ({ ...t, enabled: false })); if (!confirm('取代現有工具？匯入 JS 具本頁權限，所有工具將先停用。')) return; commit(next); load(tools[0]?.id ?? null); }));
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
try {
  const saved = localStorage.getItem(KEY);
  if (saved) { const data = JSON.parse(saved); if (data.format !== 1 || !Array.isArray(data.tools)) throw new Error('已儲存資料格式錯誤'); tools = Validator ? data.tools.map(normalize) : data.tools; }
  else { tools = defaults(); if (Validator) commit(tools); }
  load(tools[0]?.id ?? null);
  if (Validator) report('Tool Playground 已就緒；勾選允許後，可連接 MCP relay。');
} catch (error) { tools = []; load(null); report('載入失敗，原有本地資料未刪除：' + error.message + '。可匯入備份或手動還原預設。', true); }
attachBridge({
  ready: () => Boolean(Validator),
  allowed: () => $('trust').checked,
  list: () => { requireValidator(); return { version, tools: snapshot() }; },
  run: (name, args, expectedVersion) => {
    requireValidator();
    if (expectedVersion !== version) throw new Error('REGISTRY_CHANGED: call list_browser_tools again before executing.');
    return execute(name, args);
  },
  getVersion: () => version,
  log
});
