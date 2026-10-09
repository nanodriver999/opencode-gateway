# Docker deployment

1. Copy `.env.example` to `.env` and replace `GATEWAY_API_KEY` with a strong random secret.
2. Run `docker compose build` and `docker compose up -d`.
3. Configure your OpenCode account inside the container with `docker compose exec gateway opencode auth login`, then restart the service if needed.
4. Test `curl -H "Authorization: Bearer $GATEWAY_API_KEY" http://127.0.0.1:3000/ready`.

This Compose setup starts a managed OpenCode server inside the gateway container. Its auth state resides in the persistent `opencode-data` volume. The host port is bound to loopback only; do not expose it publicly without TLS, strong authentication and additional tool isolation.

Live E2E uses only `opencode/muse-spark-1.3-contributor-free`. The provider may require account login even when the model is free. No paid-model fallback is configured.

## OpenAI Python client

```bash
pip install openai
export GATEWAY_API_KEY=your-local-gateway-key
python examples/openai-python/client.py
```
