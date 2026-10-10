# Live LangChain + Muse Spark function-call experiment

## Verified result
- [Real live run](https://github.com/nanodriver999/opencode-gateway/actions/runs/38062433455) succeeded, reporting `LANGCHAIN_BIND_TOOLS_FULL_CYCLE_OK`.
- Python LangChain `ChatOpenAI.bind_tools([get_weather])` called a local Gateway HTTP endpoint.
- The experimental adapter invokes the real anonymous `opencode/muse-spark-1.3-contributor-free` model, generates a JSON decision as ordinary text, validates it with bounded retries, and formats an OpenAI tool_call response.
- LangChain executed the client-owned `get_weather(city='Seoul')` and sent a ToolMessage back. The real model generated a final answer.
- The run verifies tool-call transport and actual model inference, not correctness across arbitrary tasks or robust handling of malformed output.

## IMPORTANT: not production safe
- The experimental bridge uses `tools: {}` in OpenCode model requests. This does **not** constitute a deny-all policy. OpenCode built-in tools might execute.
- The run's unprivileged GitHub runner process, disposable directory, and file integrity checks do not prove operating-system-enforced isolation.
- The bridge is **never imported** from the production HTTP application; existing fail-closed OpenCode tool flags remain unchanged.
- This is a single research-grade smoke test, not native model tool calling, not a reliability benchmark, and not evidence that runtime custom tool shadowing prevents execution.

## Next acceptance criteria
1. Demonstrate an actual model-invoked OpenCode tool is blocked through runtime dispatch (not just direct test invocation of shadow handlers).
2. Enforce a restricted runtime using OS/process isolation with no accessible host filesystem, secrets, or arbitrary shell tools.
3. Repeat live LangChain E2E inside that restricted runtime, then add negative file/process/MCP tests.
4. Only then consider an opt-in production compatibility mode.