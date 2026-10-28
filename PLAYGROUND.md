# Developer Tool Playground: phase 1

Open playground.html from GitHub Pages. The two tabs are Workspace (textarea, execution consent and logs) and Tools (registry editor). Existing pages and relay code are unchanged. This phase is local editing/testing only; it does not expose the new registry to ChatGPT yet.

## Quick test

1. In Workspace enable the execution consent checkbox.
2. In Tools select write_text, set Arguments to {"text":"Hello from user JS"}, and run the saved tool. Return to Workspace to verify the textarea.
3. Edit the JS, save and rerun. Disable the tool and verify execution is rejected.
4. Create a new tool with a parameter using the form or full JSON Schema. Save, validate its arguments and run.
5. Test import/export, delete and reset defaults. Imported tools always start disabled.

## Architecture

All default and user tools share the same browser registry. Tools have name, description, enabled, inputSchema, JS body, optional title/outputSchema and annotations. execute(args, app) uses an AsyncFunction in the page realm. registry changes emit a local tool-registry-changed event for a future generic MCP bridge. Only enabled descriptors are included in that event, never JS source.

app exposes getText, setText, appendText, log, getTools, registerTool, removeTool and setToolEnabled. registerTool replaces a matching name or adds a tool. No AI-accessible tool-management tool is provided by default. A user can deliberately create one by writing JS that calls these APIs.

## Security and limitations

This is NOT a sandbox. JS has page-origin authority, including DOM, storage and network. GitHub Pages repositories under the same host share an origin: this risk is not limited to this repository path. Do not use untrusted imported JS, AI-generated code without review, credentials or sensitive data. Tool arguments can be adversarial even when tool code is user-authored. Never interpolate arguments into eval or HTML. User JS can bypass app APIs and registry controls; annotations and the consent checkbox are not security boundaries against that JS.

The schema validator is loaded from the pinned external CDN https://esm.sh/@cfworker/json-schema@4.1.1?bundle. This introduces availability and supply-chain trust in that CDN. Failed loading blocks validation/save/execution rather than silently running unvalidated tools. The library targets JSON Schema 2020-12 with documented unsupported cases. The UI preserves unknown keywords in raw schemas but does not guarantee full meta-schema validation or consistent interpretation by every model. Only local fragment refs are accepted; remote refs are not resolved. Defaults are annotations, not automatic assignments. Output validation runs AFTER JS, so failure does not roll back effects.

The 10-second Promise waiting limit does not terminate JS. Infinite loops can freeze the page; pending async work can still perform effects after a timeout. No hard CPU or memory sandbox exists. Reload may be required. Return values must be JSON serializable; undefined becomes null. Inputs/schemas/code/count/output have PoC size limits.

Tool definitions and code persist in localStorage. Workspace text, execution consent and logs do not. Different tabs hold independent in-memory registry snapshots and do not live-sync storage updates. Last saving tab can overwrite shared local storage; use separate exported backups for concurrent experiments. Browser data clearing loses saved tools. The export includes JS and any secrets manually embedded in it; do not embed secrets.

A later phase will connect list_browser_tools and call_browser_tool through the existing fixed MCP URL and pairing card. Until then ChatGPT still sees the previous relay-defined tools, not this registry. No browser execution testing has been performed by the repository authoring tool.
