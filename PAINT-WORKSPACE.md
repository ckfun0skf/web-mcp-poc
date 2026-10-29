# Paint workspace milestone (not yet enabled)

The upstream JS Paint engine is now vendored. This changes the workspace core so text and paint metadata can coexist; existing text data remains readable. The add_workspace tool is able to create paint metadata, but the UI intentionally disables manual Paint creation and agent drawing remains unavailable until document isolation is complete.

## Blocking issues

- JS Paint uses browser-origin storage and global state; a naive same-origin iframe can share autosave/session state between workspaces.
- The initial frame adapter intentionally rejects bootstrap rather than risking cross-workspace corruption. It is not imported into the preview page.
- Need a verified preload hook that namespaces localStorage/sessionStorage, and need to inspect IndexedDB, history/session code and export/import of the actual document; intercepting only Web Storage is insufficient.
- Need a stable paint-specific document persistence strategy and upgrade/rollback path before exposing drawing.
- JS Paint's own tool selection, pointer dispatch, history and multi-stage gestures must be connected and tested before paint_gesture is registered.

## Current acceptance boundary

The text preview continues to work, including text workspaces, built-in tool preferences and WebMCP registration. list_workspace can show paint metadata and add_workspace can create paint metadata, but it cannot draw or open an editor yet. No claim of usable Paint workspace is made. The original Playground and homepage remain unchanged.
