import { describe, expect, it, vi } from "vitest";
import { completeToolRequest } from "../src/openai/client-tools.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";
const base={
  model:"opencode/muse-spark-1.3-contributor-free",
  messages:[{role:"user",content:"Find Seoul"}],
  tools:[{type:"function",function:{name:"lookup",parameters:{
    type:"object",properties:{city:{type:"string"},limit:{type:"integer",minimum:1}},
    required:["city"],additionalProperties:false,
  }}}],
};
function backend(args: unknown) {
  const session={
    create:vi.fn(async()=>({data:{id:"s1"}})),
    prompt:vi.fn(async()=>({data:{info:{
      structured:{kind:"tool_calls",content:"",calls:[{name:"lookup",arguments:args}]},
      tokens:{input:1,output:1},
    },parts:[]}})),
    delete:vi.fn(async()=>({data:true}))
  };
  return {session,runtime:{client:{session}} as unknown as OpenCodeRuntime};
}
describe("client tool JSON Schema validation",()=>{
  it("accepts arguments conforming to declared function schema",async()=>{
    const {runtime}=backend({city:"Seoul",limit:2});
    const response=await completeToolRequest(runtime,base,"opencode");
    expect(response.choices[0].finish_reason).toBe("tool_calls");
  });
  it("rejects wrong types before responding to the client",async()=>{
    const {runtime,session}=backend({city:17,limit:"two"});
    await expect(completeToolRequest(runtime,base,"opencode")).rejects.toThrow(/JSON Schema/);
    expect(session.delete).toHaveBeenCalled();
  });
  it("rejects omitted required parameters",async()=>{
    const {runtime}=backend({limit:2});
    await expect(completeToolRequest(runtime,base,"opencode")).rejects.toThrow(/JSON Schema/);
  });
  it("rejects unexpected properties",async()=>{
    const {runtime}=backend({city:"Seoul",command:"rm"});
    await expect(completeToolRequest(runtime,base,"opencode")).rejects.toThrow(/JSON Schema/);
  });
});
