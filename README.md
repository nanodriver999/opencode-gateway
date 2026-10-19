# OpenCode Gateway

An experimental OpenAI-compatible HTTP gateway backed by OpenCode. The intended architecture is **LangChain owns the agent and executes client tools**; OpenCode supplies model inference only.

## Status and limitations

- HTTP endpoints: `GET /health`, `GET /ready`, `GET /v1/models`, `POST /v1/chat/completions`.
- Text chat and streaming are implemented; OpenAI-compatible client function request/response conversion exists, including tool result history validation and argument schema checks.
- The **production client-tools code currently asks OpenCode for structured JSON output**. The free Muse Spark provider has rejected some structured-output/tool configurations. Do not infer that free-model function calling is fully supported.
- A **research-only** bridge in `scripts/live-langchain-isolated-bridge.mjs` successfully demonstrated a Python LangChain function call and `ToolMessage` roundtrip with live Muse Spark. It uses `tools: {}`, which **is not a security boundary** and must not be copied into production as-is.
- Normal production requests use `INTERNAL_TOOLS_DISABLED`. The exact OpenCode runtime enforcement and all possible escape routes have not been proven. The gateway itself does **not** execute LangChain functions.
- Do not deploy the research bridge to a publicly accessible or privileged host.

## Quick start (development)

Requirements: Node.js 22+, npm, an accessible OpenCode server.

```sh
npm install
npm run typecheck
npm test
npm run build

# Configure an API key before starting:
export GATEWAY_API_KEY='set-a-private-secret'
export OPENCODE_MODE=external
export OPENCODE_URL=http://127.0.0.1:4096
npm start
```

By default the Gateway listens on `127.0.0.1:3000`. An OpenCode instance must already listen at `OPENCODE_URL` when external mode is selected. Alternatively, `OPENCODE_MODE=managed` starts a local OpenCode instance. Model/provider availability depends on the installed OpenCode runtime.

A basic request:

```sh
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"opencode/muse-spark-1.3-contributor-free","messages":[{"role":"user","content":"Say hello"}]}'
```

## LangChain integration

LangChain clients can use the OpenAI-compatible base URL `http://127.0.0.1:3000/v1` and the `GATEWAY_API_KEY` value. A Python `bind_tools()` tool lifecycle example exists in `scripts/langchain-tool-contract.py`; CI tests it using a mocked OpenCode backend. A separate manual live experiment exists but is **not** part of the production backend.

The intended flow is:
`LangChain -> Gateway -> OpenCode model -> Gateway returns tool_calls -> LangChain executes tool -> LangChain sends ToolMessage -> Gateway -> model`.

## Security notes

Keep the Gateway and OpenCode listening on loopback for local testing. Use isolated unprivileged processes, strict filesystem/network boundaries, and allowlisted LangChain tool implementations before using shell/file tools with untrusted inputs. Never treat `tools: {}` or a JavaScript pre-tool hook as an OS isolation mechanism. No production-grade sandbox guarantee is claimed.

## Development

```sh
npm run typecheck
npm test
npm run build
npm run test:contract
```

See `docs/` for provider limitations and research-only tool hook experiments. Next milestones: preserve secure tool-disabled inference, build a genuine client-tools backend that works with the supported provider, and demonstrate LangChain tool ownership in an isolated E2E environment.

## License

See LICENSE if present.
