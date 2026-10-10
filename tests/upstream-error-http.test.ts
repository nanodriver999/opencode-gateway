import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";

const model="opencode/muse-spark-1.3-contributor-free";
describe("safe upstream API failure response",()=>{
  it("returns a classified code without leaking a provider token",async()=>{
    const session={
      create:vi.fn(async()=>({data:{id:"s"}})),
      prompt:vi.fn(async()=>({data:{info:{error:{name:"APIError",data:{
        type:"FreeTierError",
        message:"Free tier access restricted; Authorization: Bearer provider-secret-token"
      }}},parts:[]}})),
      delete:vi.fn(async()=>({data:true}))
    };
    const app=createApp(loadConfig({GATEWAY_API_KEY:"test-api-key"}),{client:{session}} as unknown as OpenCodeRuntime);
    const result=await app.inject({method:"POST",url:"/v1/chat/completions",
      headers:{authorization:"Bearer test-api-key"},
      payload:{model,messages:[{role:"user",content:"Hello"}]}});
    expect(result.statusCode).toBe(502);
    expect(result.json().error.code).toBe("provider_free_tier_restricted");
    expect(result.body).not.toContain("provider-secret-token");
    expect(session.delete).toHaveBeenCalled();
    await app.close();
  });
});
