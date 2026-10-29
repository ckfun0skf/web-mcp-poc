# Agent Paint tools: first connected implementation

The preview registry now includes paint_get_state, paint_set_style, paint_gesture, paint_undo and paint_redo. All are built-in, read-only definitions with per-tool enable/disable preferences. There is no global execution checkbox.

## Integration

A same-origin module is loaded inside the visible JS Paint iframe on first tool use. It imports the pinned engine functions for tool selection and history and supplies those to jspaint-adapter.js. It accesses the engine's existing global lexical state inside that frame rather than constructing a second renderer.

Only the currently visible Paint workspace can be targeted. Unknown IDs, text targets and background Paint workspaces are rejected. The editor must have loaded before a bridge can be created. Initial image restoration may be asynchronous; confirm the displayed document before agent drawing. Drawing tools are a preview and have not been browser-tested by the authoring tool.

## Supported gestures

- pencil, brush, eraser: array of image-pixel coordinates
- line, rectangle, ellipse: exactly two points
- fill: exactly one point
- optional button 0 or 2 and shiftKey
- colors: foreground/background CSS color strings; size 1-64 sets pencil, brush, eraser and shape stroke width together

Example paint_gesture arguments:

```json
{"workspace_id":"<paint workspace ID>","tool":"line","points":[[0,0],[100,100]]}
```

## Limits and tests still required

Curves, polygons, text, selections, style modes, exports and full JS Paint parity are not implemented in this agent adapter. Users can still use the engine UI normally. Tool selection and styles may change the user's currently selected settings.

The bridge rejects an existing pointer operation, selection, textbox, menu/dialog or multi-stage tool. It blocks trusted input inside the iframe during its own operation, but parent-page workspace switching is not locked. Switching or deleting a workspace during execution is not yet guaranteed safe; avoid it during this preview. Calls can leave partial changes if cancelled; no automatic retries or rollback. Undo grouping and UI events must be verified in a real browser. Revision numbers currently track text writes, not Paint edits.

Manually test state, line and pencil paths, colors/size, undo/redo, zoom/scroll coordinate mapping, concurrent calls, disabled-tool rejection, cancellation and two-workspace isolation before treating this as validated. No automated or browser execution tests have been run in this change.
