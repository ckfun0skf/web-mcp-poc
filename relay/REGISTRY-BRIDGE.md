# Generic registry relay: server checkpoint

This commit adds list_browser_tools and call_browser_tool at the fixed /mcp endpoint, retaining existing tools, pairing resources and legacy endpoints. It does NOT yet connect playground.html. The next frontend commit must implement the protocol below. Until then the local Playground remains local-only and old textarea pages return REGISTRY_UNSUPPORTED immediately.

The entry becomes registry-worker.js. Existing Durable Object class names and migrations are retained. Registry sessions extend the current class without changing the namespace. /health stage generic-relay-ready means installed server code, not a completed integration test.

## Browser protocol

1. Connect the existing /browser WebSocket using the browser key. Receive ready and expiry as before.
2. Send {type:registry_ready, protocol:1}; expect registry_ack. This opts the socket into generic operations.
3. On {type:registry_list,id}, return {type:registry_result,id,success:true,result:{version,tools}}. tools includes only enabled descriptors and never JS source.
4. On {type:registry_call,id,toolName,registryVersion,arguments}, check authorization, exact version, enabled status and input schema before execution. Return {type:registry_result,id,success:true,result:{version,value}}. Return success:false and error for failures.
5. Do not accept legacy write_text commands in Playground: they would bypass editable tool enable/disable state. Reject them explicitly with a write_result error if received.

## Limits and correctness

One generic/legacy pending command per target browser is checked when starting a generic operation. Browser must also serialize execution, because legacy commands and user manual tests can race. Relay waits at most 15 seconds. Browser execution will use its existing 10-second soft waiting limit; neither limit terminates arbitrary JS or guarantees rollback.

Maximum 50 descriptors, 128,000 characters per listing, 180,000 characters per inbound WebSocket frame and 64,000 characters per tool value. Browser source and credentials must never be included in registry descriptors. Returned annotations and descriptions are untrusted data. Generic calls conservatively advertise write/destructive/open-world behavior even if a user labels a tool read-only.

Token/handle authorization is unchanged: no OAuth; handles are bearer capabilities. Each call resolves its own handle binding. The browser is authoritative for runtime input validation and current registry version. A concurrent registry change must cause a stale version rejection before JS starts. Metadata-only or JS-only edits must both increase the version.

Compatibility forwarding invokes the previous stateless JSON-response SDK handler in-process for the existing tool/resource methods; there is no public-network round trip or extra model invocation. Browser JS is never executed on Cloudflare.

Verify Cloudflare builds and old pairing behavior after deployment. Generic browser end-to-end tests are pending the next frontend commit. The authoring tool has not run the cloud or browser runtime.
