# Live client Tool Calling with isolated shadow tools

## Recorded GitHub Actions experiments (2026-10-10 KST)

- Initial experiment: https://github.com/nanodriver999/opencode-gateway/actions/runs/38012463816
- Explicit JSON Schema vs plain output: https://github.com/nanodriver999/opencode-gateway/actions/runs/38012556047
- Plain JSON text Gateway adapter: https://github.com/nanodriver999/opencode-gateway/actions/runs/38012634566

The experiment ran actual anonymous Muse Spark through a sandboxed OpenCode server with replacement tool handlers. No paid model fallback.

Findings:
- Direct calls to nine shadow handlers were denied and the isolated protected file did not change.
- Free Muse Spark succeeded with a plain text response. Asking for JSON in ordinary text produced text, not structured provider output.
- SDK `format: json_schema` failed with provider APIError: only `auto` is supported for `tool_choice`; `none`, `required`, and function-specific choices are not supported.
- The existing Gateway structured-output function-selection adapter failed with 502. Removing `format: json_schema` for this sandbox trial still failed, because the model generated invalid JSON (`Invalid model JSON`) despite the tool-selection instructions.
- No successful client-owned function-call and follow-up tool-result E2E was observed.

Security and implementation notes:
- Prompt-generated JSON and post-validation are not identical to provider-native tool calling. They require strict schema validation, bounded retries, and safe parse/error handling.
- Nine replacement tools blocking direct invocation does not establish OpenCode dispatch precedence, full MCP/plugin isolation, or OS-level security.
- Experimental empty `tools` settings were reverted in product handlers before creating this PR. The manually rerunnable workflow uses the repository's current secure production settings and is not expected to pass a live function-cycle test until compatibility is fixed.
- Never silently enable OpenCode internal execution as a way to make LangChain client tools work.

Next investigation: compare OpenCode provider-native `tool_choice` restrictions to the structured-output implementation, add a validated plain JSON decision parser with bounded retry only in an explicitly isolated/no-execution environment, and test actual client function cycles using OpenAI SDK and LangChain.