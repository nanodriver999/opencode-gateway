import Fastify from "fastify";
import type { GatewayConfig } from "./config.js";
import type { OpenCodeRuntime } from "./opencode/client.js";
import { verifyOpenCode } from "./opencode/client.js";
import { ChatInputError, completeChat } from "./openai/handler.js";

export function createApp(config: GatewayConfig, runtime: OpenCodeRuntime) {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.x-api-key"] }, bodyLimit: 1024 * 1024 });

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") return;
    if (request.headers.authorization !== `Bearer ${config.GATEWAY_API_KEY}`) {
      return reply.code(401).send({error:{message:"Invalid API key",type:"authentication_error",code:"invalid_api_key"}});
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
  app.post("/v1/chat/completions", async (request, reply) => {
    try {
      return await completeChat(runtime, request.body, config.OPENCODE_PROVIDER);
    } catch (error) {
      if (error instanceof ChatInputError) {
        return reply.code(400).send({error:{message:error.message,type:"invalid_request_error",code:"invalid_request"}});
      }
      request.log.error({ err: error }, "OpenCode completion failed");
      return reply.code(502).send({error:{message:"Upstream OpenCode request failed",type:"api_error",code:"upstream_error"}});
    }
  });
  return app;
}
