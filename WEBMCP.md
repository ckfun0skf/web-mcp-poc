# Native WebMCP and retained WebSocket test transport

## Scope

The editable Playground now publishes enabled, saved tools through native document.modelContext.registerTool when supported. The existing Cloudflare/WebSocket test route remains independent. No extension or new repository is created. No relay protocol change or Worker deployment is required by these changes.

Both entry points call the same existing api.run / execute path, retaining input/output validation, consent checks, enabled checks, registry-version checks and the shared concurrency flag. WebSocket does NOT execute through native WebMCP: this is intentionally a dual-entry implementation for testing, not the future generic WebMCP gateway.

## Native lifecycle

Serve over HTTPS or a trustworthy local development origin. The native panel feature-detects document.modelContext.registerTool. Unsupported browsers show an explicit message; no polyfill or fake native support is installed. Existing local tests and WebSocket remain available.

Tools are published only while the page execution-consent checkbox is checked and the validator is ready. Registry saves, enable/disable, delete/import/reset and consent changes unregister previous registrations using AbortController and register the current enabled snapshot. Only this module's registrations are removed. Unsaved drafts are not exposed. pagehide unregisters tools; a restored BFCache page resynchronizes on pageshow.

Each registration callback captures its registry version and checks authorization/staleness before using the shared executor. Recoverable errors are returned as structured values so agents can read them. destructiveHint is mapped to native consequentialHint; annotations remain hints, not access controls. outputSchema validation stays in the shared runtime rather than relying on native registration metadata.

## Cancellation limitation

Native cancellation is checked before dispatch and after completion, but the existing arbitrary user-JS runtime does NOT receive the execution signal. Cancellation, unregistering, consent withdrawal, timeout or stopping WebSocket cannot terminate already-started JS or roll back side effects. Do not use this PoC for long-running network tools or consequential operations without adding cooperative AbortSignal support to the user-code runtime.

## Acceptance tests (not yet browser-verified)

1. Open playground.html on a WebMCP-enabled browser. Before checking consent there must be no tools published by this module.
2. Check consent without connecting Cloudflare. The native panel should show enabled tool count. Use a WebMCP inspector/agent to list and execute read_text/write_text.
3. Save edited JS and rediscover tools; verify the changed behavior. Disable/delete a tool and verify it disappears and old callbacks fail.
4. Uncheck consent: native registrations disappear and WebSocket disconnects.
5. Re-check consent, connect WebSocket and use the existing ChatGPT pairing flow. list_browser_tools/call_browser_tool should work as before.
6. Stop WebSocket only: native registrations remain available.
7. Unsupported browser: clear native-unavailable message, with local and WebSocket tests still working.
8. Concurrent native/remote calls use the existing shared running lock. Never auto-retry an ambiguous write.

Reference API: https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/agentic-javascript-tools (document.modelContext, registration AbortSignal lifecycle). Older navigator.modelContext/provideContext/unregisterTool variants are not emulated.
