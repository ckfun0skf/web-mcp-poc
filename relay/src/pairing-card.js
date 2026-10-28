export const PAIRING_HTML = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>連接 textarea</title>
<style>
body { font: 14px/1.6 system-ui,sans-serif; padding: 16px; margin: 0; color: #222; background: #fafafa; }
input { box-sizing: border-box; width: 100%; padding: 10px; }
button { margin: 10px 8px 0 0; padding: 8px 14px; }
p { overflow-wrap: anywhere; }
</style>
</head>
<body>
<h2>連接你的 textarea</h2>
<p>先喺 WebApp 按「允許 AI 寫入」，保持頁面開住。將該頁嘅專屬 MCP URL 或 64 位 token 貼到以下欄位。唔好貼其他服務嘅密碼。</p>
<form id="form">
<label for="token">短期配對資料</label>
<input id="token" type="password" autocomplete="off" spellcheck="false" required>
<button id="pair" type="submit">配對</button>
<button id="notify" type="button" disabled>通知 AI 使用此分頁</button>
</form>
<p id="status" role="status">未配對。配對資料會交予 ChatGPT 卡片工具及 relay；唔係平台不可見嘅秘密通道。</p>
<script>
'use strict';
const form = document.querySelector('#form');
const token = document.querySelector('#token');
const pair = document.querySelector('#pair');
const notify = document.querySelector('#notify');
const status = document.querySelector('#status');
let handle = null;
let expiresAt = 0;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!window.openai?.callTool) { status.textContent = 'ChatGPT 卡片工具 bridge 未就緒；請稍後再試或回報此訊息。'; return; }
  pair.disabled = true;
  notify.disabled = true;
  handle = null;
  status.textContent = '檢查 browser 連線中…';
  const browserToken = token.value.trim();
  token.value = '';
  try {
    const result = await window.openai.callTool('pair_browser', { browser_token: browserToken });
    const data = result.structuredContent;
    const privateData = result._meta;
    if (result.isError || !data?.paired || !/^[a-f0-9]{64}$/.test(privateData?.handle || '') || !Number.isFinite(privateData?.expiresAt) || privateData.expiresAt <= Date.now()) throw new Error('Pairing rejected');
    handle = privateData.handle;
    expiresAt = privateData.expiresAt;
    notify.disabled = false;
    status.textContent = '配對成功。有效至 ' + new Date(expiresAt).toLocaleTimeString() + '。按「通知 AI」將短期 handle 交畀模型。';
  } catch { status.textContent = '配對失敗：請檢查 browser 頁面仍然連接、資料正確及未過期。'; }
  finally { pair.disabled = false; }
});
notify.addEventListener('click', async () => {
  if (!handle || Date.now() >= expiresAt) { status.textContent = '配對已過期，請重新配對。'; return; }
  if (!window.openai?.sendFollowUpMessage) { status.textContent = '此 host 未提供 follow-up bridge，請回報此訊息。'; return; }
  notify.disabled = true;
  try {
    await window.openai.sendFollowUpMessage({ prompt: 'Textarea PoC 已配對。之後只使用 fixed MCP write_text，browser_handle=' + handle + '。請等候我提供要寫入嘅文字，唔好自行寫入。此 handle 只供本次授權使用；過期或斷線時請重新呼叫 show_pairing_card。' });
    status.textContent = '已通知 AI；請喺對話提供要寫入嘅文字。';
  } catch { notify.disabled = false; status.textContent = '通知 AI 失敗，可以重試。'; }
});
</script>
</body>
</html>`;
