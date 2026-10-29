# Paint integration: adapter foundation

## Status

The coordinate gesture adapter is implemented as a standalone module. It is not connected to the preview UI or WebMCP yet. Paint workspaces must remain unavailable until the engine, persistence and integration tests are complete.

## Upstream inspection

Inspected 1j01/jspaint LICENSE.txt and src/simulate-random-gestures.js. JS Paint's simulator dispatches jQuery pointerenter, pointerdown, pointermove, pointerup and pointerleave events on a target canvas. The adapter follows that event transport, but actual compatibility is not yet browser-tested.

The upstream root license is MIT, copyright (c) 2022 Isaiah Odhner. Any vendored distribution must preserve the full license and audit bundled dependency notices. No upstream engine source is included in this commit.

## Host contract

createJSPaintAdapter receives canvas, the frame's jQuery instance, selectTool and assertIdle. Optional undo, redo and exportPNG callbacks must call the upstream engine rather than a separate history or renderer.

- One same-origin engine instance per workspace; no global shared canvas.
- selectTool must use the upstream tool selection path and reject unsupported names.
- assertIdle must reject when a user gesture, open menu, selection transaction or incompatible multi-stage operation is active. The integration must also prevent user input from interleaving during an agent gesture.
- The frame must stay visible while gestures execute; hidden workspace calls need an explicit activation policy before this module can be exposed.
- Coordinates are image pixels with top-left origin; CSS scaling is converted using the canvas bounding rectangle. Host layout must not add canvas borders, rotation or skew.
- Coordinates are finite and in bounds; up to 10000 points per gesture. Pending paths are copied and revalidated before execution.
- Calls are serialized per adapter. Abort/disposal blocks queued calls; an interrupted gesture may commit partial work on pointerup and is not automatically rolled back.
- Curves, polygons, text, selection operations, styles and multi-stage tools require dedicated host integration. This module does not claim full tool parity.
- Undo/redo grouping must be verified against upstream history. One gesture is not yet guaranteed to equal one undo item.

## Remaining implementation

1. Vendor a pinned upstream revision and required assets, with license notices.
2. Create an isolated engine instance for each Paint workspace and wire the host callbacks.
3. Add Paint workspace storage and schema migration without disturbing text data.
4. Integrate paint tools into the shared enabled-tool registry. All built-ins remain read-only and non-deletable but individually disableable; no Allow agent execution checkbox.
5. Test line (0,0) to (100,100), pencil paths, right-button behavior, zoom, scrolling, cancellation, undo/redo and multi-workspace isolation in a real browser.
6. Add other upstream operations and publish a feature compatibility checklist.

No automated or browser execution tests have been run for this standalone adapter in this commit.
