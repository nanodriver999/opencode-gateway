# Anonymous Muse Spark 1.3 free-model E2E

The model `opencode/muse-spark-1.3-contributor-free` is available through the OpenCode `opencode` provider without an individual provider API key or account login, subject to model availability, region restrictions, and provider policies.

The workflow `.github/workflows/free-model-e2e.yml` starts the gateway in managed mode with no OpenCode credential. It generates a random `GATEWAY_API_KEY` solely for local API authentication (not provider authentication), then calls the model with the official OpenAI Node SDK.

The existing CI remains credential-free and tests mocked OpenCode calls. Unlike normal CI, free-model E2E contacts an actual external model and may fail due to upstream availability, geo-policy, free tier changes, or network restrictions. Such failures are not evidence of a test pass.

Run **Actions → Free-model E2E (anonymous) → Run workflow** to repeat the live check. No repository Actions secrets or variables are required.

During the PR verification, an anonymous GitHub-hosted runner received HTTP **403 FreeTierError** directly from OpenCode Zen using the public credential; the gateway consequently returned HTTP 502 for the same model. This is a verified upstream free-tier access denial in that runner, not evidence that an individual OpenCode API key is required. The live test has therefore **not passed**. Run the workflow manually to recheck when provider policy or runner conditions change.

Test assertions cover model listing, text response, and SSE response; they do not yet validate native function calling. Do not substitute paid models.
