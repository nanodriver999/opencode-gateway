import {describe,expect,it,vi} from "vitest";
import {prepareToolRequest,completeToolRequest} from "../src/openai/client-tools.js";
import type {OpenCodeRuntime} from "../src/opencode/client.js";
const model="opencode/muse-spark-1.3-contributor-free";
const tools=[{type:"function",function:{name:"get_weather",parameters:{type:"object",properties:{city:{type:"string"}}}}}];
const body={model,tools,messages:[{role:"user",content:"Weather for Seoul?"}]};
function fixture(structured:unknown) {
  const session={create:vi.fn(async()=>({data:{id:"s1"}})),
    prompt:vi.fn(async()=>({data:{info:{structured,tokens:{input:5,output:7}},parts:[]}})),
    delete:vi.fn(async()=>({data:true}))};
  return {runtime:{client:{session}} as unknown as OpenCodeRuntime,session};
}
describe("client-side tool calling adapter",()=>{
  it("returns OpenAI tool_calls and never executes client functions",async()=>{
    const {runtime,session}=fixture({kind:"tool_calls",content:"",calls:[{name:"get_weather",arguments:{city:"Seoul"}}]});
    const response=await completeToolRequest(runtime,body,"opencode");
    expect(response.choices[0].finish_reason).toBe("tool_calls");
    expect(response.choices[0].message.tool_calls?.[0].function.arguments).toBe('{"city":"Seoul"}');
    expect(session.prompt).toHaveBeenCalledWith(expect.objectContaining({tools:expect.objectContaining({bash:false,edit:false})}), expect.objectContaining({signal:expect.any(AbortSignal)}));
    expect(session.delete).toHaveBeenCalledWith({sessionID:"s1"});
  });
  it("includes tool result in transcript",()=>{
    const request={...body,messages:[...body.messages,
      {role:"assistant",content:null,tool_calls:[{id:"call_1",function:{name:"get_weather",arguments:'{"city":"Seoul"}'}}]},
      {role:"tool",tool_call_id:"call_1",content:"sunny"}]};
    expect(prepareToolRequest(request).prompt).toContain("CLIENT_TOOL_RESULT");
  });
  it("rejects unmatched tool result and unsupported tool streaming",()=>{
    expect(()=>prepareToolRequest({...body,stream:true})).toThrow();
    expect(()=>prepareToolRequest({...body,messages:[{role:"tool",tool_call_id:"unknown",content:"no"}]})).toThrow();
  });
  it("rejects model output conflicting with tool_choice none",async()=>{
    const {runtime}=fixture({kind:"tool_calls",content:"",calls:[{name:"get_weather",arguments:{}}]});
    await expect(completeToolRequest(runtime,{...body,tool_choice:"none"},"opencode")).rejects.toThrow();
  });
});
