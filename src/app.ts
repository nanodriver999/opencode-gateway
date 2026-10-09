import Fastify from "fastify";
import { GatewayTimeoutError } from "./opencode/deadline.js";
import { createRequestGuard } from "./security/request-guard.js";
import type { GatewayConfig } from "./config.js";
import type { OpenCodeRuntime } from "./opencode/client.js";
import { verifyOpenCode } from "./opencode/client.js";
import { ChatInputError, completeChat } from "./openai/handler.js";
import { listModels } from "./openai/models.js";
import { streamChat } from "./openai/stream.js";
import { normalizeChatRequest } from "./openai/chat-contract.js";
import { completeToolRequest, prepareToolRequest } from "./openai/client-tools.js";
import { streamToolRequest } from "./openai/tool-stream.js";

export function createApp(config: GatewayConfig, runtime: OpenCodeRuntime) {
  const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.x-api-key"] }, bodyLimit: 1024 * 1024 });
  const guard = createRequestGuard(config.GATEWAY_API_KEY, config.GATEWAY_RATE_LIMIT);
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") return;
    if (!guard.authorized(request.headers.authorization)) {
      return reply.code(401).send({error:{message:"Invalid API key",type:"authentication_error",code:"invalid_api_key"}});
    }
    if (!guard.allow(request.ip)) {
      return reply.code(429).header("retry-after", "60").send({
        error:{message:"Rate limit exceeded",type:"rate_limit_error",code:"rate_limit_exceeded"}
      });
    }
  });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try { await verifyOpenCode(runtime); return { status: "ready", backend: "opencode" }; }
    catch { return reply.code(503).send({ status: "unavailable", backend: "opencode" }); }
  });
  app.get("/v1/models", async (_request, reply) => {
    try { return await listModels(runtime); }
    catch { return reply.code(502).send({error:{message:"Unable to retrieve OpenCode models",type:"api_error",code:"upstream_error"}}); }
  });
  app.get<{Params:{"*":string}}>("/v1/models/*", async (request, reply) => {
    try {
      const listed = await listModels(runtime);
      const found = listed.data.find((model) => model.id === request.params["*"]);
      if (!found) return reply.code(404).send({error:{message:"Model not found",type:"invalid_request_error",code:"model_not_found"}});
      return found;
    } catch { return reply.code(502).send({error:{message:"Unable to retrieve OpenCode models",type:"api_error",code:"upstream_error"}}); }
  });
  app.post("/v1/chat/completions", async (request, reply) => {
    if (request.body && typeof request.body === "object" && "tools" in request.body) {
      if ((request.body as {stream?:unknown}).stream === true) {
        try { prepareToolRequest({...(request.body as object),stream:false}); }
        catch (error) {
          if (error instanceof GatewayTimeoutError) return reply.code(504).send({error:{message:"Upstream request timed out",type:"timeout_error",code:"upstream_timeout"}});
        if (error instanceof ChatInputError) return reply.code(400).send({error:{message:error.message,type:"invalid_request_error"}});
          throw error;
        }
        // Compute before committing SSE headers: upstream errors remain HTTP 502.
        let chunks;
        try {
          chunks = [];
          for await (const chunk of streamToolRequest(runtime,request.body,config.OPENCODE_PROVIDER)) chunks.push(chunk);
        } catch (error) {
          request.log.error({err:error},"Tool streaming preparation failed");
          return reply.code(502).send({error:{message:"Upstream tool decision failed",type:"api_error"}});
        }
        reply.hijack();
        reply.raw.writeHead(200,{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-cache","connection":"keep-alive"});
        for (const chunk of chunks) {
          if (reply.raw.destroyed) break;
          reply.raw.write("data: "+JSON.stringify(chunk)+"\n\n");
        }
        if (!reply.raw.destroyed) reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
        return;
      }
      try { return await completeToolRequest(runtime, request.body, config.OPENCODE_PROVIDER,config.GATEWAY_UPSTREAM_TIMEOUT_MS); }
      catch (error) {
        if (error instanceof GatewayTimeoutError) return reply.code(504).send({error:{message:"Upstream request timed out",type:"timeout_error",code:"upstream_timeout"}});
        if (error instanceof ChatInputError) return reply.code(400).send({error:{message:error.message,type:"invalid_request_error",code:"invalid_request"}});
        request.log.error({err:error},"Tool decision failed");
        return reply.code(502).send({error:{message:"Tool decision unavailable",type:"api_error",code:"upstream_error"}});
      }
    }
    if ((request.body as {stream?: unknown})?.stream === true) {
      try { normalizeChatRequest({...(request.body as object), stream:false}); }
      catch (error) {
        if (error instanceof ChatInputError) return reply.code(400).send({error:{message:error.message,type:"invalid_request_error"}});
        throw error;
      }
      reply.hijack();
      reply.raw.writeHead(200, {"content-type":"text/event-stream","cache-control":"no-cache","connection":"keep-alive"});
      try {
        for await (const chunk of streamChat(runtime, request.body, config.OPENCODE_PROVIDER)) {
          if (reply.raw.destroyed) break;
          reply.raw.write("data: " + JSON.stringify(chunk) + "\n\n");
        }
        if (!reply.raw.destroyed) reply.raw.write("data: [DONE]\n\n");
      } catch (error) { request.log.error({err:error},"OpenCode streaming failed"); }
      finally { reply.raw.end(); }
      return;
    }
    try { return await completeChat(runtime, request.body, config.OPENCODE_PROVIDER,config.GATEWAY_UPSTREAM_TIMEOUT_MS); }
    catch (error) {
      if (error instanceof GatewayTimeoutError) return reply.code(504).send({error:{message:"Upstream request timed out",type:"timeout_error",code:"upstream_timeout"}});
      if (error instanceof ChatInputError) return reply.code(400).send({error:{message:error.message,type:"invalid_request_error",code:"invalid_request"}});
      request.log.error({err:error},"OpenCode completion failed");
      return reply.code(502).send({error:{message:"Upstream OpenCode request failed",type:"api_error",code:"upstream_error"}});
    }
  });
  return app;
}
