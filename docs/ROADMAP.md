# Client-executed tool calling roadmap

## Architecture
Clients using OpenAI SDK / LangChain / LangGraph supply function schemas and execute selected functions themselves. Gateway must never execute client functions or register them as OpenCode custom tools. OpenCode provides model inference only.

## Staged PRs
1. Non-streaming function-call adapter: validate `tools`, `tool_choice`, serialize prior assistant/tool history, return OpenAI `tool_calls`. Use OpenCode JSON-schema output as a model decision (not native tool API). Never execute a tool.
2. Stream tool calls as SSE deltas, with stable IDs, indexes and `finish_reason: "tool_calls"`.
3. Validate multi-turn role fidelity, OpenAI SDK and LangChain `bind_tools` compatibility; avoid interpreting flattened transcript as native roles.
4. Add cancellation, timeout, controlled retries and safe errors.
5. Real E2E with `opencode/muse-spark-1.3-contributor-free`; never use paid-model fallback.
6. Consider Responses API separately once feasibility is confirmed.

The structured-output strategy is only an approximation of native tool calling. Validate every returned function name and arguments before exposing them to clients; clients remain responsible for validating and executing results.
