# Playground generic MCP connection

This commit completes the browser-side wiring to the registry relay introduced in 0f8862f. The relay must already be deployed. It also updates the pairing card text/mode, so wait for both Pages and Worker builds. No browser or cloud execution test has been performed by the authoring tool.

## Test

1. Open playground.html from GitHub Pages, hard-refresh if cached. Verify local tools still work.
2. In Workspace enable trusted JS execution, then click 連接／更新 token. Wait for generic relay ready. The token is not persistent.
3. ChatGPT uses the existing fixed /mcp URL with authentication None. Refresh its tool definitions if list_browser_tools/call_browser_tool are missing.
4. Ask for show_pairing_card. Select Tool Playground, paste the new token, pair, then click Notify AI. Do not share tokens or handles in screenshots.
5. Ask the model to list_browser_tools, then call_browser_tool for write_text with arguments {"text":"Hello generic tools"} and the returned registry_version. Do not call the legacy MCP write_text tool.
6. Edit saved JS or add a custom tool; ask the model to list again and run it. Registry edits do not require reconnecting.
7. Disable/delete a tool and verify stale calls fail; re-list should omit disabled tools. Invalid arguments must fail before JS execution.
8. Stop or uncheck execution consent, then verify new remote calls cannot execute. Test another browser tab with its own token to confirm isolation.

The registry is pulled live from the page, not pushed to a global tools list. JS source stays in the browser registry; only descriptors and operation results are deliberately forwarded. A user-written tool can of course explicitly return or send any accessible data.

Both manual and remote calls use the same execute() function and its running flag, enabled check, input/output validators and logs. Exact registry version is checked immediately before calling it. Tools edited during an in-flight call affect future calls, not the code snapshot already running.

The browser rejects legacy write_text messages so disabling/editing the default write_text cannot be bypassed through the old tool. Every new connection gets a new token; the fixed MCP URL never changes. The server still uses its existing one-hour browser authorization and up-to-30-minute handles.

Stop/disconnect prevents new dispatch and discards late replies. It cannot kill already-started same-page JS or undo effects. Soft timeouts do not terminate code; an async tool can still run after timeout, and an infinite loop may freeze the page. Request-id replay caching is per connection (last 32 replies), not durable exactly-once delivery. Do not auto-retry writes.

The HTML warning is updated by the bridge module at runtime; if it still says this phase is local-only and AI controls are absent, the updated JS did not load. Existing local storage and old PoC pages remain intact. No OAuth is added.
