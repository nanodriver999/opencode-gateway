import {describe,it,expect} from "vitest";
import {decodeToolDecision} from "../src/openai/tool-json.js";

describe("strict model decision parsing",()=>{
 it("accepts native structured objects",()=>expect(decodeToolDecision({kind:"message"})).toEqual({kind:"message"}));
 it("accepts bare JSON",()=>expect(decodeToolDecision('{"kind":"message","calls":[]}')).toEqual({kind:"message",calls:[]}));
 it("accepts single fenced JSON payload",()=>expect(decodeToolDecision('```json\n{"kind":"tool_calls","calls":[]}\n```')).toEqual({kind:"tool_calls",calls:[]}));
 it("rejects explanation around a JSON body",()=>expect(()=>decodeToolDecision('Here is the call: {"kind":"message"}')).toThrow("Invalid model JSON"));
 it("rejects malformed JSON",()=>expect(()=>decodeToolDecision('{"kind":')).toThrow("Invalid model JSON"));
 it("rejects excessive model output",()=>expect(()=>decodeToolDecision("x".repeat(256001))).toThrow("size limit"));
});
