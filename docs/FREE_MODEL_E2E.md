# Anonymous Muse Spark 1.3 free-model E2E

The model `opencode/muse-spark-1.3-contributor-free` is available through the OpenCode `opencode` provider without an individual provider API key or account login, subject to model availability, region restrictions, and provider policies.

The workflow `.github/workflows/free-model-e2e.yml` starts the gateway in managed mode with no OpenCode credential. It generates a random `GATEWAY_API_KEY` solely for local API authentication (not provider authentication), then calls the model with the official OpenAI Node SDK.

The existing CI remains credential-free and tests mocked OpenCode calls. Unlike normal CI, free-model E2E contacts an actual external model and may fail due to upstream availability, geo-policy, free tier changes, or network restrictions. Such failures are not evidence of a test pass.

Run **Actions → Free-model E2E (anonymous) → Run workflow** to repeat the live check. No repository Actions secrets or variables are required.

During the PR verification, an anonymous GitHub-hosted runner received HTTP **403 FreeTierError** directly from OpenCode Zen using the public credential; the gateway consequently returned HTTP 502 for the same model. This is a verified upstream free-tier access denial in that runner, not evidence that an individual OpenCode API key is required. The live test has therefore **not passed**. Run the workflow manually to recheck when provider policy or runner conditions change.

Test assertions cover model listing, text response, and SSE response; they do not yet validate native function calling. Do not substitute paid models.

## Alternative model verification (GitHub Actions, 2026-10-10 KST)

[Live E2E run](https://github.com/nanodriver999/opencode-gateway/actions/runs/37980207618) evaluated other free models without a provider API key:

| Model | Listed by OpenCode | Result |
|---|---|---|
| `opencode/big-pickle` | Yes | Gateway HTTP 502 |
| `opencode/mimo-v2.5-free` | No | Skipped: absent from current catalog |
| `opencode/nemotron-3-ultra-free` | Yes | Gateway HTTP 502 |
| `opencode/ling-3.0-flash-fin-free` | Yes | Request timed out (40 seconds) |

No candidate completed both chat and SSE, so this **live E2E failed**; do not mark the gateway as successfully integrated with these models. A separate anonymous Zen diagnostic still showed HTTP 403 `FreeTierError` for the previous Muse Spark model. A 502 on other models is not sufficient evidence of exactly the same root cause because Gateway currently masks upstream error details.

The manual workflow runs candidates sequentially, never falls back to paid models, and does not require an OpenCode account. The provider model roster changes over time; use the model catalog as the source of truth for names at execution time.
