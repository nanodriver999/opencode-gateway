import { describe, expect, it, vi } from "vitest";
import { streamChat } from "../src/openai/stream.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";
describe("streaming OpenAI adapter", () => {
  it("emits content and final chunk for only its session", async () => {
    const session = {
      create: vi.fn(async () => ({data:{id:"s1"}})),
      promptAsync: vi.fn(async () => ({data:true})),
      abort: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    };
    const event = {subscribe: async () => ({stream:(async function*() {
      yield {type:"message.part.delta",properties:{sessionID:"other",field:"text",delta:"no"}};
      yield {type:"message.part.delta",properties:{sessionID:"s1",field:"text",delta:"yes"}};
      yield {type:"session.idle",properties:{sessionID:"s1"}};
    })()})};
    const rt = {client:{session,event}} as unknown as OpenCodeRuntime;
    const chunks = [];
    for await (const c of streamChat(rt,{model:"opencode/muse-spark-1.3-contributor-free",messages:[{role:"user",content:"Hi"}],stream:true},"opencode")) chunks.push(c);
    expect(chunks.map(c=>c.choices[0].delta)).toEqual([{role:"assistant"},{content:"yes"},{}]);
    expect(chunks[2].choices[0].finish_reason).toBe("stop");
    expect(session.delete).toHaveBeenCalledWith({sessionID:"s1"});
  });
});
