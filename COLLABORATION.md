# Workspace collaboration and registered agents

Each workspace has Discussion and Activity. Conversations/logs stay in web-mcp-poc.collaboration.v1 IndexedDB; existing workspace contents, custom definitions and prior identity history are retained. No relay, cloud sync, agent scheduler or automatic test workflow is added.

## Registration: updated tool contract

register_identity accepts {name} without an existing token. The app generates an agent ID and a cryptographically random 256-bit opaque token. The result envelope is {call_id,identity,workspace_id:null,result:{identity,identity_token,expires_at,instructions}}. Default lifetime is seven days. Registration is a built-in definition, cannot be edited/deleted and can be disabled.

All other native calls require identity_token instead of the previous identity object. The app resolves the identity; caller-supplied ID/name is rejected. Preserve the token across calls and workspaces. Missing, expired, revoked or rotated credentials fail before domain execution. A second verification occurs immediately before dispatch, but revocation cannot terminate arbitrary code already started or guarantee cancellation of all internally queued operations. Refresh agent tool listings after upgrading.

Native results remain {call_id,identity,workspace_id,result}. Custom tools require workspace_id for activity routing and receive app.identity, never the private token. identity and identity_token are reserved argument names. Existing custom definitions with either field must be migrated. Local User posts/manual tests use their existing user- identity through an internal UI path, not an agent token.

Registering again creates a separate identity, even for the same name. The token proves possession of this local credential, not the identity of a model/person. The app cannot force a model to remember a lost token. User-authorized reissue preserves the identity ID/history; a name alone cannot recover credentials through an agent tool.

## Registered Agents UX

Sidebar Registered Agents opens the management view with name/ID search, Active/Expired/Revoked filters, counts, registration time, last verified call and expiry. Tokens are masked by default. Reveal displays a token for 20 seconds; closing the view, changing search/filter, blurring the window or hiding the document masks displayed credentials. Copy token writes directly to clipboard with success/error feedback. If clipboard access is unavailable, reveal and manually copy. Clipboard contents are not automatically cleared.

View activity shows up to 100 recent matching records across existing workspaces and System Activity. Deleted workspace history is not included in this management view. Revoke and Rotate/Reissue require explicit confirmation displaying the agent name and ID. Rotation creates a new seven-day credential and invalidates the old one; expired/revoked agents can be reactivated through Reissue. Identity and history are retained. No agent tool lists all credentials, rotates tokens or revokes another agent.

To support user Reveal/Copy after reload, raw tokens are intentionally recoverable from a separate local IndexedDB, web-mcp-poc.agent-tokens.v1. Verification uses a SHA-256 index. This does not protect against arbitrary same-origin JS or local browser access. Current developer code is not sandboxed and can tamper with storage. UI masking is accidental-exposure protection, not an authentication/security boundary. Protect browser access and only run trusted code.

## Keeping tokens out of collaboration content

Registration is specially handled: only ID/name/expiry are logged, never its token-bearing result. Other tool input/output summaries, normal results, message posts and token-management logs redact the standard agt_ token format, including strings containing it. Token fields are removed before forwarding tool arguments. There is no general token export, and management activity uses public metadata only. Transformed/encoded credentials or arbitrary developer code can bypass heuristic redaction; never put tokens into workspace content, URLs, descriptions or code. User management access remains intentional and local.

## Messages and activity

workspace_list_messages, workspace_post_message and workspace_list_logs remain built-in and individually disableable. Messages support replies, related call IDs and idempotency keys; plain-text bodies are limited to 8000 characters. Lists use limit 1-100 and before_seq/next_before_seq. Log filters include identity_id, tool, status and call_id. Omit workspace_id for System Activity. Current log-read calls exclude themselves; UI reads do not generate recursive tool calls.

The common wrapper writes a running record before dispatch and a bounded success/error summary after. list_workspace and untargeted failures go to System Activity; successful add_workspace records move to the created workspace. Invalid credentials produce a best-effort unidentified record without saving the credential. Browser/schema/expired-registration rejections that never reach the wrapper cannot be recorded there. Registration and management UI actions have explicit audit handling.

Initial log-write failure prevents execution. Finalization failure may follow completed effects and returns a warning/call ID; do not auto-retry. Pending records after interruption have unknown outcomes. Logs are not content snapshots, undo history or tamper-proof evidence. Direct user drawing/editing and arbitrary operations inside a custom call are not separate MCP calls. Agent A should read current state/history, do work, then post a handoff; Agent B uses its own credential to read/reply/continue. Messages do not wake another agent.

## Capacity and verification

History DB caps identities at 1000, activity at 20000 and messages at 5000, plus origin quota; the separate token registry caps registered agents at 1000. No silent history eviction. At capacity some calls may fail; UI page reads/exports remain available. Full history export/retention UI and authenticated multi-device or multi-tab workspace synchronization are not implemented. Deleting workspace content retains its history by ID. Browser tests are manual; no browser acceptance pass is claimed for this change.
