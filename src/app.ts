import Fastify from "fastify";
import type { GatewayConfig } from "./config.js";
import type { OpenCodeRuntime } from "./opencode/client.js";
import { verifyOpenCode } from "./opencode/client.js";

export function createApp(config: GatewayConfig, runtime: OpenCodeRuntime) {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.x-api-key"] } });

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") return;
    const authorization = request.headers.authorization;
    if (authorization !== `Bearer ${config.GATEWAY_API_KEY}`) {
      return reply.code(401).send({
        error: { message: "Invalid API key", type: "authentication_error", code: "invalid_api_key" },
      });
    }
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await verifyOpenCode(runtime);
      return { status: "ready", backend: "opencode" };
    } catch {
      return reply.code(503).send({ status: "unavailable", backend: "opencode" });
    }
  });

  return app;
}
