# Fixed MCP URL and ChatGPT pairing card

This checkpoint retains the old browser page and all previous endpoints. The Worker entry changes to ui-worker.js, re-exporting the same Durable Object class names. No new migration is required.

## Test

1. Wait for Cloudflare to deploy this commit. /health should show stage pairing-card-poc. This flag only indicates installed code, not successful ChatGPT UI rendering.
2. Add a ChatGPT custom MCP server once: https://web-mcp-poc-relay.ckfun0skf.workers.dev/mcp ; authentication None.
3. Open the GitHub Pages mcp-poc.html page and click 允許 AI 寫入. Keep it open. Copy its private MCP URL, but DO NOT add that private URL as a new MCP server. In this version the old URL is used only as pairing data.
4. In ChatGPT choose this fixed server and ask: 請呼叫 show_pairing_card，讓我連接 textarea。
5. Paste the private URL into the card password field and click 配對.
6. Click 通知 AI 使用此分頁. This explicitly posts a temporary handle to the conversation. Then ask the model to call write_text with that handle and the desired text.
7. Stop browser authorization and verify writes fail. Reconnect the page and pair again in a new card; keep the fixed MCP server configuration unchanged.

## Security boundaries

This is not OAuth and has no user identity. Possession of a token or operation handle authorizes writes. The raw pairing data passes through the ChatGPT host/bridge as a UI tool argument; it is not a platform-invisible secret. It is not intentionally returned in model-visible content. Handle and expiry are returned in _meta for the card, and the card explicitly shares the handle only when the user presses Notify AI. Handles are also bearer capabilities and must not be shared publicly.

UI-only tool metadata is a host visibility instruction, not a server-side authentication boundary. The public endpoint validates pairing data and an active browser before issuing a handle. No global active-user state is used. Each command carries its own handle.

Handles expire after at most 30 minutes or at the original browser authorization expiry, whichever is sooner. Browser disconnect stops actual writes; server detection can lag. Re-pairing issues another handle and does not revoke earlier handles; use Stop on the browser and reconnect to invalidate access to that old browser session. Handle record alarms delete expired bindings.

The card uses ChatGPT's window.openai bridge, without external JS/CDN requests. Raw pairing values are cleared from the input after submission. The original page still labels its output MCP URL; treat it as a token for this workflow. No Google setup is required.

No rate limiting, abuse protection, production identity management, or billing controls are added. Use dummy data only. The authoring tool has not executed this code or verified card rendering. If the card reports that the bridge is unavailable, report that exact error; do not paste secrets into normal chat as a workaround.
