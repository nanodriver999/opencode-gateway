import { describe, it, expect, vi } from "vitest";
import type { OpenCodeRuntime } from "../src/opencode/client.js";
import { streamToolRequest } from "../src/openai/tool-stream.js";
const base = {
  model:"opencode/muse-spark-1.3-contributor-free",
  messages:[{role:"user",content:"Search"}],
  tools:[{type:"function",function:{name:"search",parameters:{type:"object"}}}],
  stream:true,
};
function mock(structured:unknown) {
  const session = {
    create:vi.fn(async()=>({data:{id:"s1"}})),
    prompt:vi.fn(async()=>({data:{info:{structured,tokens:{input:2,output:3}},parts:[]}})),
    delete:vi.fn(async()=>({data:true}))
  };
  return {session,rt:{client:{session}} as unknown as OpenCodeRuntime};
}
describe("OpenAI tool SSE",()=>{
  it("emits stable call identifiers, indexed argument deltas and terminal tool_calls",async()=>{
    const {rt,session}=mock({kind:"tool_calls",content:"",calls:[{name:"search",arguments:{query:"text"}}]});
    const chunks=[];
    for await(const c of streamToolRequest(rt,base,"opencode")) chunks.push(c);
    expect(chunks.map(c=>c.id).every(id=>id===chunks[0].id)).toBe(true);
    const deltas=chunks.flatMap(c=>(c.choices[0].delta.tool_calls ?? []) as Array<{index:number,id?:string,function:{name?:string,arguments:string}}>);
    expect(deltas[0].index).toBe(0);
    expect(deltas[0].function.name).toBe("search");
    expect(deltas.map(d=>d.function.arguments).join("")).toBe('{"query":"text"}');
    expect(chunks.at(-1)?.choices[0].finish_reason).toBe("tool_calls");
    expect(session.delete).toHaveBeenCalledTimes(1);
  });
  it("streams ordinary assistant answer when no tool chosen",async()=>{
    const {rt}=mock({kind:"message",content:"Hi!",calls:[]});
    const chunks=[];
    for await(const c of streamToolRequest(rt,base,"opencode")) chunks.push(c);
    expect(chunks.some(c=>c.choices[0].delta.content==="Hi!")).toBe(true);
    expect(chunks.at(-1)?.choices[0].finish_reason).toBe("stop");
  });
});
