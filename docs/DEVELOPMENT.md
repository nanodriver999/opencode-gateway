# OpenCode Gateway development

## Scope of PR 1

Bootstrap a TypeScript/Fastify gateway with OpenCode SDK v2, lifecycle management, liveness/readiness endpoints, bearer authentication, and tests.

Chat Completions, SSE and model listing are intentionally left for later PRs. The `/health` endpoint only reports gateway process health; the authenticated `/ready` endpoint contacts OpenCode.

## Setup

1. Install Node.js 22+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set a strong `GATEWAY_API_KEY`.
4. Use `OPENCODE_MODE=external` and start `opencode serve --port 4096` separately, or use managed mode.
5. Export the variables from `.env` using your preferred process environment loader (the gateway does not load dotenv automatically).
6. Run `npm run dev`, `npm test`, and `npm run build`.

## Testing provider

E2E model: `opencode/muse-spark-1.3-contributor-free`. Do not silently select a paid fallback. Live model calls require a configured OpenCode account and are not part of PR 1.

## Security

The gateway defaults to loopback binding. Never expose an OpenCode backend containing agent tools to untrusted clients without server-side tool policy restrictions. A bearer token on the gateway alone is not sufficient sandbox isolation.
