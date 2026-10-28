# WebSocket round-trip checkpoint

Open the GitHub Pages `relay-poc.html` page after both GitHub Pages and Cloudflare Workers Builds finish deploying the new commit. The original index.html is unchanged.

1. Click 連接 relay. Expect 已連接 Cloudflare relay.
2. Click 經 relay 測試寫入. The browser sends a test request without textarea contents.
3. Cloudflare generates a fixed message with server UTC timestamp and sends a write_text command back over the same socket.
4. Only a matching pending response updates the textarea.
5. Click 斷開. The page stops accepting commands from that socket.

The Worker health stage is now websocket-test; mcpReady remains false. No MCP tool or AI call exists yet. This is a same-browser round-trip test, not proof of ChatGPT access or a separate remote controller.

The Worker accepts browser WebSocket upgrades only from https://ckfun0skf.github.io. Origin checks are not user authentication. A random 256-bit routing key is generated per connection in browser memory; it is sent in the WSS query string and may appear in infrastructure logs. Do not share keys or network captures. This is a bounded manual PoC without production authentication, rate limiting, billing controls, or session expiry. Do not publish for general use yet; avoid repeated unnecessary sessions.

The source has not been executed in a browser or deployed by the repository authoring tool. Cloudflare deployment occurs separately through your configured Git integration.
