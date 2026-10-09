import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";
const config=loadConfig({GATEWAY_API_KEY:"test-key"});
const headers={authorization:"Bearer test-key"};
function fixture() {
  const session={
    create:vi.fn(async()=>({data:{id:"s1"}})),
    prompt:vi.fn(async()=>({data:{info:{structured:{kind:"tool_calls",content:"",calls:[{name:"lookup",arguments:{query:"x"}}]},tokens:{input:1,output:1}},parts:[]}})),
    delete:vi.fn(async()=>({data:true})),
  };
  const app=createApp(config,{client:{session}} as unknown as OpenCodeRuntime);
  return {app,session};
}
const body={
  model:"opencode/muse-spark-1.3-contributor-free",
  messages:[{role:"user",content:"Find x"}],
  tools:[{type:"function",function:{name:"lookup",parameters:{type:"object"}}}],
  stream:true,
};
describe("SSE framing and timeout HTTP contracts",()=>{
  it("writes real SSE double newlines and DONE marker",async()=>{
    const {app}=fixture();
    const response=await app.inject({method:"POST",url:"/v1/chat/completions",headers,payload:body});
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("\n\n");
    expect(response.body).toContain("data: [DONE]\n\n");
    expect(response.body).toContain('"tool_calls"');
    await app.close();
  });
});
