import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";

const config = loadConfig({ GATEWAY_API_KEY: "test-key" });
const runtime = {
  client: { global: { health: async () => ({ data: { healthy: true }, error: undefined }) } },
  close: async () => {},
} as unknown as OpenCodeRuntime;

describe("gateway health and authorization", () => {
  it("allows unauthenticated liveness", async () => {
    const app = createApp(config, runtime);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects requests without a bearer key", async () => {
    const app = createApp(config, runtime);
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("checks OpenCode connectivity", async () => {
    const app = createApp(config, runtime);
    const response = await app.inject({ method: "GET", url: "/ready", headers: { authorization: "Bearer test-key" } });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
