import {describe,expect,it} from "vitest";
import {normalizeChatRequest,toChatCompletion,ChatInputError} from "../src/openai/chat-contract.js";
const model="opencode/muse-spark-1.3-contributor-free";
describe("multimodal/structured request mapping",()=>{
  it("maps a PNG data URL to a file part",()=>{
    const req=normalizeChatRequest({model,messages:[{role:"user",content:[
      {type:"text",text:"Describe"},{type:"image_url",image_url:{url:"data:image/png;base64,aGVsbG8="}}
    ]}]});
    expect(req.parts).toEqual([{type:"text",text:"Describe"},
      {type:"file",mime:"image/png",url:"data:image/png;base64,aGVsbG8="}]);
  });
  it("rejects external URLs and unsupported content",()=>{
    expect(()=>normalizeChatRequest({model,messages:[{role:"user",content:[{type:"image_url",image_url:{url:"https://private.example/"}}]}]})).toThrow(ChatInputError);
  });
  it("maps OpenAI json_schema to OpenCode format",()=>{
    const req=normalizeChatRequest({model,messages:[{role:"user",content:"Hi"}],
      response_format:{type:"json_schema",json_schema:{name:"result",schema:{type:"object",properties:{ok:{type:"boolean"}}}}}});
    expect(req.format?.type).toBe("json_schema");
    expect(req.format?.schema.type).toBe("object");
  });
  it("serializes structured output as assistant JSON",()=>{
    const output=toChatCompletion(model,{info:{structured:{ok:true}},parts:[]}, "id", 1);
    expect(output.choices[0].message.content).toBe('{"ok":true}');
  });
});
