import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { INTERNAL_TOOLS_DISABLED } from "../src/opencode/tool-policy.js";

describe("OpenCode internal tool safety policy",()=>{
  it("disables every known executable builtin",()=>{
    expect(Object.keys(INTERNAL_TOOLS_DISABLED).sort()).toEqual(
      ["bash","edit","glob","grep","read","webfetch","write"]);
    expect(Object.values(INTERNAL_TOOLS_DISABLED).every(v=>v===false)).toBe(true);
    expect(Object.isFrozen(INTERNAL_TOOLS_DISABLED)).toBe(true);
  });
  it.each([
    "src/openai/handler.ts",
    "src/openai/client-tools.ts",
    "src/openai/stream.ts",
  ])("enforces centralized deny flags in %s",(filename)=>{
    const source=readFileSync(new URL("../"+filename,import.meta.url),"utf8");
    expect(source).toContain("tools: INTERNAL_TOOLS_DISABLED");
    expect(source).not.toMatch(/tools\s*:\s*\{\s*\}/);
  });
});
