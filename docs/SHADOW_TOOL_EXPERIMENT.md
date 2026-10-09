# OpenCode custom shadow tool isolation experiment

This is an isolated experiment, not a change to production Gateway tool permissions.

## Results: 2026-10-10 KST

Actual GitHub Actions run: https://github.com/nanodriver999/opencode-gateway/actions/runs/37996204250

- Nine custom names: bash, read, write, edit, glob, grep, webfetch, task, apply_patch.
- The test directly invoked each custom tool handler and all nine rejected execution with GATEWAY_TOOL_EXECUTION_BLOCKED.
- The actual Muse Spark free model returned SHADOW_MODEL_OK with an empty prompt tools map.
- A user prompt asking the model to invoke bash produced ZERO tool parts. Neither the protected file nor the forbidden-output file was modified.

## Critical limitation

The tool-ID inventory listed duplicate names. The model did not actually invoke a tool during the test. Therefore the experiment did NOT establish OpenCode dispatch precedence or that a tool invocation would be intercepted. Direct invocation only tests the replacement implementation.

This approach is NOT a security boundary. Production Gateway's explicit disable flags remain unchanged in this PR, despite those flags causing model access errors in earlier tests. Do not deploy empty tool flags solely on the basis of these experiments. Verify actual runtime dispatch, plugin/MCP execution paths, and operating-system isolation before enabling shadow tools.

LangChain functions remain client-executed and separate from OpenCode internal tools.