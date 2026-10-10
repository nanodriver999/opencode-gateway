import {describe,it,expect,vi} from "vitest";
import {generateValidatedDecision,validateFunctionDecision,InvalidDecisionError} from "../src/openai/prompt-decision.js";

const tools=[{name:"get_weather",parameters:{
  type:"object",properties:{city:{type:"string"}},required:["city"],additionalProperties:false
}}];
const result={kind:"tool_calls",content:"",calls:[{name:"get_weather",arguments:{city:"Seoul"}}]};
describe("prompt-based function decisions (sandbox-only)",()=>{
  it("accepts correctly constrained function selections",()=>{
    expect(validateFunctionDecision(JSON.stringify(result),tools,"required")).toEqual(result);
  });
  it("rejects unknown function names",()=>{
    expect(()=>validateFunctionDecision({...result,calls:[{name:"bash",arguments:{city:"Seoul"}}]},tools,"auto")).toThrow(InvalidDecisionError);
  });
  it("rejects wrong argument types and extra keys",()=>{
    expect(()=>validateFunctionDecision({...result,calls:[{name:"get_weather",arguments:{city:123}}]},tools,"auto")).toThrow();
    expect(()=>validateFunctionDecision({...result,calls:[{name:"get_weather",arguments:{city:"Seoul",command:"unsafe"}}]},tools,"auto")).toThrow();
  });
  it("enforces tool_choice required, none, and named function",()=>{
    expect(()=>validateFunctionDecision({kind:"message",content:"hello",calls:[]},tools,"required")).toThrow();
    expect(()=>validateFunctionDecision(result,tools,"none")).toThrow();
    expect(validateFunctionDecision(result,tools,{name:"get_weather"}).kind).toBe("tool_calls");
    expect(()=>validateFunctionDecision(result,tools,{name:"other"})).toThrow();
  });
  it("retries malformed responses at most the configured count",async()=>{
    const infer=vi.fn().mockResolvedValueOnce("not JSON").mockResolvedValueOnce("```json\n"+JSON.stringify(result)+"\n```");
    const selected=await generateValidatedDecision(infer,{prompt:"weather Seoul",tools,choice:"required"},{maxAttempts:2});
    expect(selected.kind).toBe("tool_calls");
    expect(infer).toHaveBeenCalledTimes(2);
    expect(infer.mock.calls[1][0]).toContain("Prior output was invalid");
  });
  it("bounds repeated errors to three attempts",async()=>{
    const infer=vi.fn().mockResolvedValue("nonsense");
    await expect(generateValidatedDecision(infer,{prompt:"weather Seoul",tools,choice:"required"},{maxAttempts:100})).rejects.toThrow("3 attempts");
    expect(infer).toHaveBeenCalledTimes(3);
  });
  it("does not run inference when cancelled",async()=>{
    const controller=new AbortController();controller.abort();
    const infer=vi.fn();
    await expect(generateValidatedDecision(infer,{prompt:"weather",tools,choice:"auto"},{signal:controller.signal})).rejects.toThrow("aborted");
    expect(infer).not.toHaveBeenCalled();
  });
});
