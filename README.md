# Workspace Playground

A client-side, multi-workspace playground exposing built-in and user-defined tools through native WebMCP.

## Open

https://ckfun0skf.github.io/web-mcp-poc/playground.html

The site root redirects to playground.html. The former workspace-preview.html URL redirects to the same page. There is one application UI; the historical workspace-preview-app.js filename remains the active application entry module.

## Workspaces

Fresh browser data starts with no workspaces. Create Text Area Playground, Paint Playground or Canvas Playground from the UI or add_workspace. Workspace IDs stay stable after renaming.

- Text: independent text, explicit-ID read/write/append/clear tools, local saving and .txt export.
- Paint: vendored JS Paint in separate iframe/local session instances, native image backups and in-memory history. Agent tools currently support pencil, line, brush, eraser, fill, rectangle and ellipse, plus colors/size and undo/redo. The target must be visible. Full JS Paint agent operation parity is not complete.
- Canvas: Three.js scenes with explicit-ID get/run-code/clear tools, camera orbit/zoom, snapshot saving and PNG export. Animation functions and arbitrary runtime behavior do not replay after refresh.

## Tools

WebMCP Tool Settings lists built-in definitions, which cannot be edited/deleted but can each be disabled, including list_workspace and add_workspace. Enabled tools register automatically; no Allow agent execution checkbox.

Custom Tools provides a two-column editor, visual top-level parameter builder, advanced JSON Schema, JavaScript body, metadata, validation, manual tests and import/export. Only saved enabled custom tools are registered. Built-in tool names are reserved. See CUSTOM-TOOLS.md.

## Connection

The active application uses native WebMCP only. It does not create a WebSocket connection, generate pairing tokens or require Cloudflare. An agent or extension must provide compatible browser integration; API presence alone does not mean every AI client can access the page tools. See WEBMCP.md.

Historical WebSocket/relay files still exist pending physical deletion, but playground.html does not load them. The separate web-mcp-relay repository is outside this cleanup and is unchanged.

## Data and execution

Existing preview storage keys are retained so the homepage switch does not intentionally reset workspaces or tool preferences. Text/workspace records, Canvas snapshots, custom definitions and Paint session image backups remain local to the browser, subject to storage quota and clearing. Tool outputs may be transmitted to an agent and external assets/CDNs can use the network.

Custom JS and Canvas code execute with page/origin permissions, not in a sandbox. Only use trusted code and test data. Infinite loops can freeze the page; cancellation cannot forcibly terminate arbitrary started code or undo effects. Errors or output validation can occur after modification. Do not automatically retry unknown failures.

## Manual checks

No automatic browser tests run on push. paint-regression.html is available for manual checks; its optional GitHub Actions workflow is workflow_dispatch only. Homepage publication, native WebMCP calls and browser feature behavior still require manual verification; commit success is not an end-to-end pass.

Implementation notes: CANVAS.md, CUSTOM-TOOLS.md, PAINT-TOOLS.md and JSPAINT-VENDOR.md. Earlier milestone documents describe historical partial states and are pending consolidation/removal.
