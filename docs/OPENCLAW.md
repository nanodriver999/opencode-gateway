# OpenClaw integration

This repository includes an OpenClaw provider plugin that connects to an **already-running OpenCode Gateway**. It does not launch another gateway and does not enable local shell/file tools.

1. Start the gateway and check `GET /ready` with your gateway bearer key.
2. Install this repository as an OpenClaw plugin, for example: `openclaw plugins install https://github.com/nanodriver999/opencode-gateway` (verify your OpenClaw version's plugin installation flow).
3. Configure the plugin id `opencode-gateway` with `baseUrl=http://127.0.0.1:3000/v1` and `apiKey=<gateway API key>`, or supply `OPENCODE_GATEWAY_API_KEY` in the OpenClaw process environment.
4. Enable the plugin and restart OpenClaw Gateway.
5. Run `openclaw models auth login --provider opencode-gateway --method gateway`.
6. Select `opencode-gateway/opencode/muse-spark-1.3-contributor-free` if it is returned as available.

Provider auth reads live model identifiers from the gateway and creates a configuration patch without overriding an existing default model automatically. OpenClaw model capability information such as context window and token output ceiling is **not exposed by the gateway yet**; the plugin uses configurable conservative defaults (8192 / 2048), which must be adjusted for actual models. It advertises text input only.

The integration is tested with a mocked OpenClaw API and gateway catalog. Actual installed OpenClaw integration and Muse Spark model calls are not run in CI. Its API key is distinct from the provider login managed by OpenCode.
