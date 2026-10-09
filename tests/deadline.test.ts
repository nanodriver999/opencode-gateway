import { describe, expect, it, vi } from "vitest";
import { withDeadline, GatewayTimeoutError } from "../src/opencode/deadline.js";
describe("upstream deadline", () => {
  it("resolves completed work", async () => {
    expect(await withDeadline(async () => "ok", 500)).toBe("ok");
  });
  it("aborts a hung request", async () => {
    let wasAborted = false;
    await expect(withDeadline(signal => new Promise<never>(() => {
      signal.addEventListener("abort", () => {wasAborted = true;}, {once:true});
    }), 20)).rejects.toBeInstanceOf(GatewayTimeoutError);
    expect(wasAborted).toBe(true);
  });
  it("propagates upstream failures unchanged", async () => {
    await expect(withDeadline(async () => { throw Error("upstream"); }, 500)).rejects.toThrow("upstream");
  });
});
