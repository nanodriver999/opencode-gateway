import { afterEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";

const model = "opencode/muse-spark-1.3-contributor-free";
const tools = [{
  type: "function" as const,
  function: {
    name: "lookup",
    description: "Look up a city",
    parameters: { type: "object", properties: {city: {type: "string"}}, required: ["city"] },
  },
}];
const apps: Array<ReturnType<typeof createApp>> = [];
async function setup(structured: unknown = undefined) {
  const session = {
    create: vi.fn(async () => ({ data: { id: "s1" } })),
    prompt: vi.fn(async () => ({ data: {
      info: { structured, finish:"stop", tokens: {input:4, output:5} },
      parts: structured === undefined ? [{type:"text",text:"Hello!"}] : [],
    } })),
    delete: vi.fn(async () => ({ data: true })),
  };
  const runtime = { client: {
    session,
    provider: {list: async () => ({ data: { connected:["opencode"], all:[{
      id:"opencode",models:{"muse-spark-1.3-contributor-free":{}}
    }] } })},
  }} as unknown as OpenCodeRuntime;
  const app = createApp(loadConfig({GATEWAY_API_KEY:"test-key"}), runtime);
  apps.push(app);
  await app.listen({host:"127.0.0.1",port:0});
  const address = app.server.address();
  if (!address || typeof address === "string") throw Error("Unexpected listen address");
  const client = new OpenAI({baseURL:`http://127.0.0.1:${address.port}/v1`,apiKey:"test-key",maxRetries:0});
  return {client,session};
}
afterEach(async()=>{for(const app of apps.splice(0)) await app.close();});
describe("real OpenAI Node SDK contract with mock OpenCode backend",()=>{
  it("lists models and returns a normal completion",async()=>{
    const {client}=await setup();
    const models=await client.models.list();
    expect(models.data.some(item=>item.id===model)).toBe(true);
    const answer=await client.chat.completions.create({model,messages:[{role:"user",content:"Hi"}]});
    expect(answer.choices[0].message.content).toBe("Hello!");
  });
  it("provides calls for client execution and accepts tool history",async()=>{
    const {client,session}=await setup({kind:"tool_calls",content:"",calls:[{name:"lookup",arguments:{city:"Seoul"}}]});
    const response=await client.chat.completions.create({
      model,messages:[{role:"user",content:"Lookup Seoul"}],tools
    });
    expect(response.choices[0].finish_reason).toBe("tool_calls");
    const call=response.choices[0].message.tool_calls?.[0];
    expect(call?.type).toBe("function");
    if(!call || call.type!=="function") throw Error("Expected function call");
    expect(JSON.parse(call.function.arguments)).toEqual({city:"Seoul"});
    // The tool runs only in the caller, not in OpenCode or the gateway.
    await client.chat.completions.create({
      model,tools,tool_choice:"auto",
      messages:[
        {role:"user",content:"Lookup Seoul"},
        {role:"assistant",content:null,tool_calls:[call]},
        {role:"tool",tool_call_id:call.id,content:"sunny"}
      ]
    });
    expect(session.prompt).toHaveBeenCalledTimes(2);
    expect(session.delete).toHaveBeenCalledTimes(2);
  });
  it("streams indexed tool call deltas with completion terminator",async()=>{
    const {client}=await setup({kind:"tool_calls",content:"",calls:[{name:"lookup",arguments:{city:"Seoul"}}]});
    const stream=await client.chat.completions.create({model,tools,stream:true,messages:[{role:"user",content:"Lookup Seoul"}]});
    let args="";
    let seenID="";
    let finish="";
    for await (const chunk of stream) {
      const delta=chunk.choices[0]?.delta;
      for(const call of delta?.tool_calls??[]) {
        if(call.id) seenID=call.id;
        args+=call.function?.arguments??"";
        expect(call.index).toBe(0);
      }
      if(chunk.choices[0]?.finish_reason) finish=chunk.choices[0].finish_reason!;
    }
    expect(seenID.startsWith("call_")).toBe(true);
    expect(JSON.parse(args)).toEqual({city:"Seoul"});
    expect(finish).toBe("tool_calls");
  });
});
