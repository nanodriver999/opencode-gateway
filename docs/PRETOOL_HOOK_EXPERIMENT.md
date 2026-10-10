# Pre-tool deny hook compatibility experiment

## Actual results
- [Successful live GitHub Actions run](https://github.com/nanodriver999/opencode-gateway/actions/runs/38062815915)
- Project-local OpenCode plugin exports `tool.execute.before`, throws `GATEWAY_INTERNAL_TOOL_EXECUTION_FORBIDDEN` on every tool execution.
- Direct hook invocations reject nine tool names, including shell, file operations and a sample MCP tool.
- A real OpenCode /session request triggered plugin initialization; OpenCode server log confirmed `GATEWAY_DENY_PLUGIN_LOADED`. An initial health-only attempt did not confirm loading.
- Real `muse-spark-1.3-contributor-free` and Python LangChain client-owned `get_weather` function full cycle succeeded with the plugin loaded.
- Protected file was unchanged and no unexpected file appeared.

## Explicit limitations
- The model did not issue an actual OpenCode-internal tool call during this test. Consequently hook execution in OpenCode's runtime dispatch path was **not exercised**. Runtime precedence and unguarded paths are not verified.
- Hook does not supply an OS-level security boundary. It could fail to load in other configurations or miss execution paths.
- This is research-only code in sandbox/ and scripts/, NOT enabled in the production Gateway. Production fail-closed tool flags remain unchanged.

## Required before production activation
- Obtain deterministic in-process real OpenCode tool dispatch denial (e.g. deliberately triggered safe built-in tool with observable hook marker).
- Add startup fail-closed guard verification, isolate host files, secrets and subprocesses, and enumerate plugin/MCP routes.
- Repeat live LangChain E2E in hardened runtime and verify intentional tool execution attempts produce no effects.