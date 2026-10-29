# Native WebMCP

The canonical application is playground.html. The active module is workspace-preview-app.js; its name is historical, not a second preview application.

The application registers enabled built-in and saved enabled custom descriptors using the browser's document.modelContext.registerTool API when available in a secure context. The UI reports unavailable support or registration errors; no polyfill is used to imply native capability.

There is no Allow agent execution checkbox. Built-in definitions are read-only and non-deletable, but all can be individually disabled. Custom definitions are managed separately. Changes refresh native registrations, and stale/disabled callbacks are rejected. Disabling does not undo completed operations or reliably stop arbitrary started code.

Text tools use explicit workspace IDs. Paint currently requires the target workspace to be visible; Canvas can target a workspace without switching the UI. Custom JavaScript receives ID-based workspace helpers. Tool results may leave the browser through the agent integration.

WebSocket, pairing-token and Cloudflare routes are not loaded by the canonical application. An external extension may independently connect to native WebMCP; that extension and its relay are not modified by this repo's homepage change.

Browser API support and consumer permissions are implementation-dependent. Use a compatible WebMCP inspector or extension to manually verify listing, invocation, toggles and changed tools. The optional Paint regression checks engine behavior, not a complete native consumer flow. No end-to-end validation is claimed by source-code publication alone.
