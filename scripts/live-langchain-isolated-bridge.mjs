import {createApp} from "../dist/app.js";
import {loadConfig} from "../dist/config.js";
import {createOpencodeClient} from "@opencode-ai/sdk/v2";
import {generateValidatedDecision} from "../dist/openai/prompt-decision.js";
import {randomUUID} from "node:crypto";
const opencode=createOpencodeClient({baseUrl:"http://127.0.0.1:4096"});
const session={
 create:async()=>({data:{id:"bridge-"+randomUUID()}}),
 delete:async()=>({data:true}),
 prompt:async input=>{
  const system=String(input.system??"");
  const full=String(input.parts?.[0]?.text??"");
  const toolMatches=/Only use these provided functions:\s*(\[[\s\S]*?\])\. tool_choice=([^.]*)\./.exec(system);
  if(!toolMatches)throw Error("Tool definitions not found");
  const tools=JSON.parse(toolMatches[1]);
  const rawChoice=toolMatches[2].trim();
  const choice=rawChoice==="required"||rawChoice==="none"||rawChoice==="auto"?rawChoice:{name:rawChoice};
  const result=await generateValidatedDecision(async prompt=>{
    const created=await opencode.session.create();
    if(created.error||!created.data?.id)throw Error("OpenCode session unavailable");
    try{
      const completion=await opencode.session.prompt({
        sessionID:created.data.id,
        model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
        parts:[{type:"text",text:prompt}],
        tools:{}
      });
      if(completion.error||!completion.data||completion.data.info.error)throw Error("Provider inference rejected");
      return completion.data.parts.filter(p=>p.type==="text").map(p=>p.text).join("");
    }finally{await opencode.session.delete({sessionID:created.data.id}).catch(()=>{});}
  },{prompt:system+"\n"+full,tools:tools.map(t=>({name:t.name,parameters:t.parameters})),choice},{maxAttempts:2});
  return {data:{info:{structured:result,tokens:{input:0,output:0}},parts:[]}};
 }
};
const app=createApp(loadConfig({GATEWAY_API_KEY:"integration-test-key",GATEWAY_HOST:"127.0.0.1",GATEWAY_PORT:"3099"}),{client:{session}});
await app.listen({host:"127.0.0.1",port:3099});
console.log("LIVE_LANGCHAIN_BRIDGE_READY");
process.on("SIGTERM",async()=>{await app.close();process.exit(0)});
