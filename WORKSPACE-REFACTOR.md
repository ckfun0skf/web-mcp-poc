# Workspace refactor: stage 1

## Included

- Separate English preview at workspace-preview.html. Existing playground.html and index.html are unchanged until feature parity is reached.
- Empty initial workspace collection; explicit IDs, independent text content and revisions.
- Local text persistence using a separate localStorage key. IndexedDB migration is a later stage.
- Protected list_workspace and add_workspace tools; explicit workspace_id for text tools.
- Native WebMCP registration behind a page-session execution opt-in.
- Rename, delete and text export via UI.

## Not included yet

- Paint / JS Paint integration, Canvas / Three.js, undo/redo history, IndexedDB, custom tool editor integration, WebSocket preview integration, old-file deletion and homepage cutover.
- Existing Playground and WebSocket functionality remain in their original files, not in this preview.
- No claim of JS Paint compatibility or end-to-end browser validation is made.

## Manual acceptance

1. Open workspace-preview.html with no saved preview data: no workspace exists.
2. Create two text workspaces and verify contents remain independent after switching and reload.
3. Export text, rename a workspace and delete another with confirmation.
4. Enable agent execution and inspect list_workspace and add_workspace with a native WebMCP inspector.
5. Call add_workspace with type text and a name; use the returned ID with write_text and read_text.
6. Call write_text with a stale expected_revision: expect REVISION_CONFLICT without mutation.
7. Disable agent execution: tools must no longer execute through this registration.
8. Unknown workspace IDs and unsupported types must fail, never redirect to the selected workspace.
9. Confirm the original playground.html remains available.

Automated tests and actual browser / WebMCP runtime tests have not been executed for this stage.
