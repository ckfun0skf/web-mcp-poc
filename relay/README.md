# Relay infrastructure checkpoint

This step validates Cloudflare Worker deployment and a SQLite-backed Durable Object binding. It does not implement WebSocket, session pairing, or MCP yet. The GitHub Pages frontend is unchanged.

## Deploy from your computer

Use a current Node.js LTS supported by Wrangler and npm. Clone the repo, or pull its latest main branch, then run:

```sh
cd relay
npm install
npx wrangler login
npm run deploy
```

Choose the Cloudflare account containing your existing `web-mcp-poc-relay` Worker. Deployment updates that Worker's Hello World code and creates the configured Durable Object namespace. Review Wrangler's prompts before proceeding. Cloudflare usage and billing remain subject to your account plan. Do not deploy to an unrelated account.

This CLI deployment is manual; pushing to GitHub alone does not deploy the relay. GitHub Pages continues to serve the root index.html.

## Verify

Open the deployed Worker URL with `/health`. Expected response:

```json
{
  "service": "web-mcp-poc-relay",
  "stage": "infrastructure-only",
  "worker": "ok",
  "durableObject": "ok",
  "mcpReady": false
}
```

A successful response validates Worker-to-Durable-Object routing, not AI integration. Browser and cloud execution have not been tested by the repository authoring tool.

Never share Cloudflare login credentials or commit tokens. No Cloudflare API token is required in these source files.
