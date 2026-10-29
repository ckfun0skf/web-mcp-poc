# Custom Tools

Open Custom Tools in the sidebar. The two-column editor separates saved tools from definition, parameters, JavaScript, advanced metadata and manual tests. Save explicitly; only saved enabled tools are published to native WebMCP. Built-in definitions remain immutable and non-deletable, with enable/disable in WebMCP Tool Settings. Custom tools cannot use reserved built-in names.

## Parameters

The visual builder manages top-level parameter name, type, required status and description. Each parameter has an advanced object/boolean JSON Schema editor. Full inputSchema JSON remains the source of truth and supports nested object/array structures, defaults, enums, unions and constraints. The visual builder preserves unrelated schema fields and pauses when full JSON is invalid. Renaming updates properties and required only; it does not rewrite dependentRequired, dependentSchemas, conditions or $ref paths. Review those manually. Type changes preserve advanced fields rather than silently deleting constraints.

Validate checks syntax and schema initialization without executing or saving code. JSON Schema validation uses @cfworker/json-schema 4.1.1 on demand from esm.sh. External schema references are rejected; no coercion or default insertion. Tests use the saved enabled tool, not the draft. Dirty drafts prompt before switching tools or closing and warn on page unload. Test arguments are not part of the saved tool definition.

## Runtime API

Function body receives args and app. Available: app.listWorkspaces(), app.getWorkspace(id), app.getText(id), app.setText(id,text), app.appendText(id,text), app.log(value), app.getTools(), app.registerTool(definition), app.removeTool(name) and app.setToolEnabled(name,boolean). Text APIs require workspace IDs. registerTool is async and must be awaited; tool-management methods cannot alter built-in definitions. No default agent tool for creating new tools is exposed.

## Storage and import

Existing v2 storage and export format are retained. Export contains custom definitions and JS only, not workspace content or pairing credentials. Import merges tools, rejects duplicate/reserved names and disables imports. Legacy import is explicit, does not delete old data, and requires ID-based text API migration. Invalid stored data is not silently overwritten. Use exported JSON to rename conflicting legacy tool names before importing.

## Limits

Trusted developer code only: JS has page/origin permissions, not a sandbox. It may freeze the page or bypass application-level protections. Started code cannot be forcibly stopped or rolled back. Output validation or storage can fail after side effects; never automatically retry unknown failures. Changing/removing a tool cannot terminate already-running JS. The registry rechecks saved definitions immediately before execution after asynchronous validation.

No new automatic tests or WebSocket integration are added. WebSocket support is removed from the planned scope; old code cleanup and homepage cutover remain separate pending work. Browser verification is manual; no test pass is claimed for this change.
