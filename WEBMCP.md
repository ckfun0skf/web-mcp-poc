# Native WebMCP

Open playground.html. workspace-preview-app.js is the active entry module (historical filename). The root and former preview URLs redirect to this canonical page.

The app uses document.modelContext.registerTool when the browser exposes it in a secure context. Unsupported environments report unavailable support; the app does not pretend a polyfill is native support.

Enabled built-ins and saved enabled custom tools are registered automatically. Built-in definitions cannot be changed or deleted; all can be disabled. Custom definitions, visual parameters, JavaScript and toggles are managed in Custom Tools. Updating tools refreshes registrations and stale callbacks are rejected. Disabling does not roll back completed changes or reliably stop arbitrary code already running.

Text tools require workspace IDs. Paint currently requires the target to be visible. Canvas tools can target a workspace without switching the UI. Custom JavaScript uses explicit-ID workspace helpers. Tool outputs may be sent outside the browser through the agent integration.

No embedded WebSocket, pairing-token or Cloudflare route is used by the app. The legacy embedded relay source is retired. The separate web-mcp-relay extension/relay project and any deployed Workers are outside the source cleanup; removing repository code does not delete those services or revoke credentials.

Use a compatible inspector or agent integration to manually check listing, calls, disabled-tool rejection and registry updates. Browser/consumer permissions vary. Engine regression checks do not constitute a complete native consumer test, and no end-to-end pass is implied by publication.
