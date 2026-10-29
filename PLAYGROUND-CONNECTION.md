# Playground connection

The current Playground uses native WebMCP only. Open playground.html in a compatible browser and connect using a WebMCP-capable inspector or agent integration.

Enabled tools are published automatically. Built-in tool toggles are under WebMCP Tool Settings; custom definitions and toggles are under Custom Tools. No page-level execution opt-in, WebSocket URL, pairing token, browser handle or Cloudflare deployment is required by the active application.

Previous WebSocket pairing instructions are obsolete. Old relay code remains in the repository pending physical cleanup and is not loaded by playground.html. This does not remove or change any separately deployed Worker or the independent web-mcp-relay repository.

If native support is unavailable, local workspace editing remains possible but agent tool publication is unavailable. Check the status message rather than assuming a generic AI chat client can directly call page tools.
