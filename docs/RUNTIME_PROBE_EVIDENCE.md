# Runtime dispatch evidence acceptance criteria

This offline evidence classifier distinguishes **actual hook markers** from upstream failures. Run `node scripts/test-runtime-probe-evidence.mjs`. It is not a replacement for the live OpenCode dispatch experiment.

- PASS requires plugin loaded and the server log to contain a structured `GATEWAY_TOOL_ATTEMPT_BLOCKED` marker specifically naming `bash`, with no observed side effects. This alone remains log-level evidence, not proof of OS isolation.
- INCONCLUSIVE for free-provider HTTP 403, including the observed `FREE_TIER_RESTRICTED` case; also inconclusive when no dispatch evidence exists.
- FAIL if the plugin was not loaded or side effects are detected.

Next step: integrate evidence capture into the real OpenCode runner with a deterministic controllable inference backend. Never change the production fail-closed tool policy based solely on this classifier.
