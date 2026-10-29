# Workspace Playground

A client-side multi-workspace app exposing built-in and user-defined tools through native WebMCP.

## Open

https://ckfun0skf.github.io/web-mcp-poc/playground.html

index.html and the old workspace-preview.html URL redirect to playground.html. There is one application UI. workspace-preview-app.js is the current entry module; its historical filename does not mean a separate preview app is running.

## Workspaces

Fresh browser data starts with no workspaces. Create Text Area Playground, Paint Playground or Canvas Playground in the UI or with add_workspace. Workspace IDs do not change on rename.

- Text: independent contents, explicit-ID read/write/append/clear, local persistence and .txt export.
- Paint: vendored JS Paint, separate iframe/local image sessions and in-memory history. Agent support currently includes pencil, line, brush, eraser, fill, rectangle, ellipse, colors/size and undo/redo. The target must be visible. Curves, polygons, text, selection operations and full agent parity remain incomplete.
- Canvas: independent Three.js scenes, camera controls, scene snapshot persistence, PNG export and agent code execution. Animation callbacks and arbitrary runtime behavior are not auto-replayed after refresh.

## Tool management

WebMCP Tool Settings lists immutable, non-deletable built-in definitions. Every built-in can be disabled, including list_workspace and add_workspace. Enabled tools register automatically; no Allow agent execution checkbox.

Custom Tools provides a two-column editor, visual top-level parameter builder, full JSON Schema, JavaScript, optional metadata, draft validation, saved-tool tests and import/export. Only saved enabled custom tools are exposed. Built-in names are reserved. See CUSTOM-TOOLS.md.

## Native connection only

The app does not require its own WebSocket relay, pairing token, browser handle or Cloudflare deployment. A compatible browser/agent integration is required to consume native WebMCP; API presence does not mean every AI client can directly call the tools. See WEBMCP.md.

Repository cleanup targets only legacy PoC files and the embedded relay/ directory. The independent web-mcp-relay repository and already-deployed cloud services are not changed or removed. Deleting source files does not revoke old credentials or delete deployed Workers.

## Data and execution

Existing storage keys are retained. Homepage changes and source cleanup do not intentionally clear browser workspaces, Paint image backups, custom tools or preferences. These are subject to browser quota and clearing; use external backups for important content. Tool outputs may be transmitted to agents, and CDNs/external scene assets can use the network.

Custom JS and Canvas code execute in the page realm, not a sandbox. Use trusted code and test data. Infinite loops may freeze the page; cancellation cannot reliably terminate arbitrary started code or roll back effects. Errors and output validation may occur after changes. Never automatically retry unknown failures.

## Manual checks and notes

Browser regression tests do not run automatically on push. paint-regression.html is available manually; the optional Paint Actions workflow is workflow_dispatch only. The one-time legacy cleanup job is maintenance, not a browser test; it deletes itself from the repository when its deletion commit succeeds. Source submission or cleanup does not prove Pages publication or browser feature correctness.

Current implementation notes:

- WEBMCP.md
- CUSTOM-TOOLS.md
- CANVAS.md
- PAINT-TOOLS.md
- JSPAINT-VENDOR.md

The independent vendoring job is retained for explicit engine maintenance. Old PoC milestone documents are not the current product specification.
