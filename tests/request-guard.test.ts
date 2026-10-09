import { describe, expect, it } from "vitest";
import { createRequestGuard } from "../src/security/request-guard.js";
describe("request guard", () => {
  it("requires an exact bearer API key", () => {
    const guard=createRequestGuard("secret",2);
    expect(guard.authorized("Bearer secret")).toBe(true);
    for(const value of [undefined,"secret","Bearer secretx","bearer secret","Bearer wrong"])
      expect(guard.authorized(value)).toBe(false);
  });
  it("limits each IP independently and resets by minute", () => {
    let now=0;
    const guard=createRequestGuard("secret",2,()=>now);
    expect(guard.allow("one")).toBe(true);
    expect(guard.allow("one")).toBe(true);
    expect(guard.allow("one")).toBe(false);
    expect(guard.allow("two")).toBe(true);
    now=60000;
    expect(guard.allow("one")).toBe(true);
  });
});
