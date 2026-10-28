# web-mcp-poc

## Goal

Let ChatGPT write text into a textarea in an open GitHub Pages browser tab, through a shared remote MCP relay.

## Current status: step 1 only

- Standalone static page: `index.html`.
- Replace, append, and clear controls exercise the browser-side `writeText()` function.
- Execution log shows local writes.
- No AI connection, MCP endpoint, relay, authentication, or WebMCP API integration yet.
- No external scripts, credentials, or network requests are included in this step.

## Test locally

Open `index.html` in a browser. No build step is required.

1. Click 測試覆寫: the textarea receives the sample message.
2. Click 測試追加: a new line is appended without removing existing text.
3. Click 清空: the textarea becomes empty.
4. Verify that each operation appears in the execution log.

Browser execution has not been automatically tested by the repository authoring tool.

## GitHub Pages

In repository Settings > Pages, choose Deploy from a branch, select `main` and `/ (root)`, then save. This commit does not enable Pages automatically. Use the published URL displayed by GitHub after deployment.

## Next milestones

2. Deploy a shared Cloudflare relay and connect the page over WSS.
3. Expose an MCP `write_text` tool with explicit browser-session pairing.
4. Connect ChatGPT and verify real browser writes, disconnect errors, and session isolation.

Keep the page open during future AI operations. Use dummy data during the PoC. Never commit access tokens or session secrets.
