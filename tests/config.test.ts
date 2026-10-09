import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("defaults to the free model and blocks paid fallback", () => {
    const config = loadConfig({ GATEWAY_API_KEY: "test-key" });
    expect(config.OPENCODE_PROVIDER).toBe("opencode");
    expect(config.OPENCODE_MODEL).toBe("muse-spark-1.3-contributor-free");
    expect(config.E2E_PAID_FALLBACK).toBe("false");
  });

  it("rejects exposing a sample API key", () => {
    expect(() => loadConfig({ GATEWAY_HOST: "0.0.0.0", GATEWAY_API_KEY: "replace-with-a-secret" })).toThrow();
  });
});
