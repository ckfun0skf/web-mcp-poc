# MCP write_text checkpoint

Wait for GitHub Pages and Cloudflare Workers Builds to deploy this commit. Open the GitHub Pages mcp-poc.html page, not the older relay-poc.html page.

1. Click 允許 AI 寫入. Wait for the private MCP URL to appear.
2. In ChatGPT add a custom MCP server: name Textarea PoC, server URL copied from this page, authentication None. Do not paste the URL into ordinary chat text.
3. Keep the page open. Confirm ChatGPT discovers write_text.
4. Ask: 請使用 write_text 工具，以 replace 模式寫入 Hello from ChatGPT。 Approve the write if asked.
5. Verify actual textarea contents and the browser execution log. Then test append.
6. Click 停止 AI 寫入, and request another write. It must return a tool error instead of claiming browser success.

The server uses the official SDK's stateless Streamable HTTP transport with JSON responses. A separate SQLite-backed AiBrowserSession Durable Object coordinates each authorized browser. Original local and WebSocket round-trip test pages remain unchanged. The new /health stage is mcp-poc and mcpReady is true; this means endpoint code is installed, not that ChatGPT interoperability has been tested.

## Boundaries

No OAuth is implemented. The random private MCP URL is a bearer capability: anyone holding it can request writes while that browser is connected. The browser connection key differs from its SHA-256-derived controller key. A controller URL does not reveal the browser connection key. Do not share either. Keys travel in URLs and can appear in infrastructure logs.

Each connection authorizes writes for at most one hour. Stopping disconnects locally immediately; server-side disconnect detection can lag. Reconnecting generates a new URL, so update or recreate the ChatGPT connection. Session renewal, stable OAuth accounts, and production onboarding are out of scope.

The browser sends only write acknowledgement and total length, not the full textarea contents. Text sent from ChatGPT still passes through the relay. One write is allowed in flight per session. A missing acknowledgement means outcome unknown, not proof that no write occurred. Do not automatically retry append after timeout.

No rate limiting, billing controls, exactly-once delivery, or production security audit is provided. Use short manual tests with dummy data only. Origin checks are not authentication. The new AI session binding is added with migration v2; the previous Durable Object class remains exported.

This source has not been executed or tested end-to-end by the repository authoring tool. Verify the Cloudflare build log before testing ChatGPT.
