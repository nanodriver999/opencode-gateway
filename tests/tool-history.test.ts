import { describe, expect, it } from "vitest";
import { prepareToolRequest } from "../src/openai/client-tools.js";
const model = "opencode/muse-spark-1.3-contributor-free";
const tools = [{ type: "function", function: { name: "lookup", parameters: { type: "object" } } }];
const user = { role: "user", content: "Find information" };
const call = (id: string) => ({ id, type: "function", function: { name: "lookup", arguments: '{"query":"x"}' } });
const assistant = (ids: string[]) => ({ role: "assistant", content: null, tool_calls: ids.map(call) });
const result = (id: string) => ({ role: "tool", tool_call_id: id, content: "result" });
const prepare = (messages: unknown[]) => prepareToolRequest({ model, tools, messages });
describe("tool history sequencing", () => {
  it("supports two tool results and a user follow-up", () => {
    const value = prepare([user, assistant(["a","b"]), result("a"), result("b"), user]);
    expect(value.prompt).toContain("CLIENT_TOOL_RESULT");
  });
  it("rejects missing results", () => {
    expect(() => prepare([user, assistant(["a","b"]), result("a")])).toThrow();
  });
  it("rejects duplicate results", () => {
    expect(() => prepare([user, assistant(["a"]), result("a"), result("a")])).toThrow();
  });
  it("rejects repeated call identifiers", () => {
    expect(() => prepare([user, assistant(["a","a"]), result("a")])).toThrow();
  });
  it("rejects user messages while tool results are pending", () => {
    expect(() => prepare([user, assistant(["a"]), user, result("a")])).toThrow();
  });
});
