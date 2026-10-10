# Actual runtime-dispatch probe — findings

## Evidence (2026-10-11 KST)
- [First execution](https://github.com/nanodriver999/opencode-gateway/actions/runs/38065279867): setup failed because repository has no package-lock.json and workflow used npm ci. Fixed to npm install.
- [Second execution](https://github.com/nanodriver999/opencode-gateway/actions/runs/38065319728): OpenCode 1.18.35 and deny plugin loaded; session prompt had no tool parts. Block evidence absent (inconclusive).
- [Third execution](https://github.com/nanodriver999/opencode-gateway/actions/runs/38065391243): inspecting session info and history exposed the root cause: provider APIError 403 FreeTierError, "OpenCode's free tier can only be used from within OpenCode". This was the *actual* reason for empty parts. The runtime never reached the bash dispatch hook.

## What this proves and does not prove
The experimental plugin loads, but these runs **do not** show runtime hook invocation or enforcement. The free-tier provider rejected an explicitly enabled internal-tool request before inference. A prior working LangChain client-tool cycle used `tools: {}` and is not proof that OpenCode's builtin tools were safely disabled by the hook. Keep production internal tools fail-closed. Never use `tools: {}` as a security boundary.

## Next experiment
Use a supported inference backend with tool calling in a network/filesystem-isolated disposable worker, or a deterministic offline OpenCode model adapter that emits an actual runtime builtin tool call, before claiming enforcement. Verify a real `GATEWAY_TOOL_ATTEMPT_BLOCKED` hook marker, absence of side effects, and explicit provider-error classification. No provider credentials should be checked into CI.
