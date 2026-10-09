import {describe,expect,it,vi} from "vitest";
import {streamChat} from "../src/openai/stream.js";
import type {OpenCodeRuntime} from "../src/opencode/client.js";
const payload={model:"opencode/muse-spark-1.3-contributor-free",messages:[{role:"user",content:"Hi"}]};
describe("stream lifecycle",()=>{
  it("forwards abort signal to SSE subscription and cleans session",async()=>{
    const create=vi.fn(async()=>({data:{id:"s1"}}));
    const promptAsync=vi.fn(async()=>({data:true}));
    const abort=vi.fn(async()=>({data:true}));
    const del=vi.fn(async()=>({data:true}));
    const subscribe=vi.fn(async()=>({stream:(async function*(){
      yield {type:"session.idle",properties:{sessionID:"s1"}};
    })()}));
    const runtime={client:{session:{create,promptAsync,abort,delete:del},event:{subscribe}}} as unknown as OpenCodeRuntime;
    const chunks=[];
    for await(const c of streamChat(runtime,payload,"opencode",undefined,1000)) chunks.push(c);
    expect(chunks.at(-1)?.choices[0].finish_reason).toBe("stop");
    expect(subscribe.mock.calls[0][1]).toHaveProperty("signal");
    expect(abort).toHaveBeenCalledWith({sessionID:"s1"});
    expect(del).toHaveBeenCalledWith({sessionID:"s1"});
  });
});
