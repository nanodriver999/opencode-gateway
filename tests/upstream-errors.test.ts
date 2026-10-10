import { describe, expect, it } from "vitest";
import { classifyProviderFailure } from "../src/openai/upstream-errors.js";
describe("provider failure classification",()=>{
 it("classifies real Zen free-tier rejection",()=>{
   expect(classifyProviderFailure({name:"APIError",data:{type:"FreeTierError",message:"Free tier restricted"}}).code).toBe("provider_free_tier_restricted");
 });
 it("classifies tool_choice API restrictions",()=>{
   expect(classifyProviderFailure({name:"APIError",data:{message:"only auto is supported for tool_choice"}}).code).toBe("provider_format_unsupported");
 });
 it("classifies rate limiting",()=>{
   expect(classifyProviderFailure({name:"RateLimitError",message:"Too Many Requests"}).code).toBe("provider_rate_limited");
 });
 it("does not expose provider messages or secrets",()=>{
   const failure=classifyProviderFailure({name:"Other",message:"Authorization: Bearer fake-private-key"});
   expect(failure.code).toBe("provider_model_error");
   expect(failure.message).not.toContain("fake-private-key");
 });
});
