# Free Muse Spark E2E

This opt-in workflow targets **only** `opencode/muse-spark-1.3-contributor-free`. It never falls back to a paid model.

The normal CI is credential-free and remains mandatory. The manual live workflow is intentionally gated by the repository variable `ENABLE_FREE_MODEL_E2E=true` and Actions secrets `GATEWAY_API_KEY` and `OPENCODE_API_KEY`. It will be skipped without the variable and fails explicitly without the secrets. OpenCode provider authentication may require additional account-specific configuration.

Run Actions → Free-model E2E (manual) → Run workflow. The script checks model discovery, one non-streaming response and one streaming response. This is a live smoke test, **not** comprehensive tool-calling/agent accuracy verification. Do not mark E2E successful without a completed green run.

Never put credentials in commits or runner logs.
