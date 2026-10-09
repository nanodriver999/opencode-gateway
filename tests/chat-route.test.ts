import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";

const config = loadConfig({ GATEWAY_API_KEY: "test-key" });

function fixture() {
  const session = {
    create: vi.fn().mockResolvedValue({ data: { id: "session-1" }, error: undefined }),
    prompt: vi.fn().mockResolvedValue({ data: { info: { finish: "stop", tokens: { input: 3, output: 4 } }, parts: [{ type:"text", text:"Hello!" }] }, error: undefined }),
    delete: vi.fn().mockResolvedValue({ data:true, error:undefined }),
  };
  const runtime = { client: { session, global: { health: async () => ({data:{healthy:true}}) } }, close: async () => {} } as unknown as OpenCodeRuntime;
  return {session, app:createApp(config, runtime)};
}
const headers={authorization:"Bearer test-key"};
describe("POST /v1/chat/completions", () => {
  it("converts SDK response and always cleans up the session", async () => {
    const {app,session}=fixture();
    const response=await app.inject({method:"POST",url:"/v1/chat/completions",headers,payload:{model:"opencode/muse-spark-1.3-contributor-free",messages:[{role:"user",content:"Hi"}]}});
    expect(response.statusCode).toBe(200);
    expect(response.json().choices[0].message.content).toBe("Hello!");
    expect(response.json().usage.total_tokens).toBe(7);
    expect(session.prompt).toHaveBeenCalledWith(expect.objectContaining({model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"}}));
    expect(session.delete).toHaveBeenCalledWith({sessionID:"session-1"});
    await app.close();
  });
  it("rejects unsupported multiple choices", async () => {
    const {app,session}=fixture();
    const response=await app.inject({method:"POST",url:"/v1/chat/completions",headers,payload:{model:"free",messages:[{role:"user",content:"Hi"}],n:2}});
    expect(response.statusCode).toBe(400);
    expect(session.create).not.toHaveBeenCalled();
    await app.close();
  });
  it("rejects missing authentication", async () => {
    const {app}=fixture();
    const response=await app.inject({method:"POST",url:"/v1/chat/completions",payload:{}});
    expect(response.statusCode).toBe(401);
    await app.close();
  });
  it("cleans sessions after upstream failure", async () => {
    const {app,session}=fixture();
    session.prompt.mockRejectedValueOnce(new Error("network"));
    const response=await app.inject({method:"POST",url:"/v1/chat/completions",headers,payload:{model:"free",messages:[{role:"user",content:"Hi"}]}});
    expect(response.statusCode).toBe(502);
    expect(session.delete).toHaveBeenCalledTimes(1);
    await app.close();
  });
});
