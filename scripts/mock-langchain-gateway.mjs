import {createApp} from "../dist/app.js";
import {loadConfig} from "../dist/config.js";
const session={
 create:async()=>({data:{id:"s1"}}),
 prompt:async input=>{
  const raw=String(input.parts?.[0]?.text??"");
  const followup=raw.includes("CLIENT_TOOL_RESULT");
  const structured=followup?
    {kind:"message",content:"The weather in Seoul is sunny and 22 C.",calls:[]}:
    {kind:"tool_calls",content:"",calls:[{name:"get_weather",arguments:{city:"Seoul"}}]};
  return {data:{info:{structured,tokens:{input:10,output:15}},parts:[]}};
 },
 delete:async()=>({data:true})
};
const app=createApp(loadConfig({GATEWAY_API_KEY:"integration-test-key",GATEWAY_PORT:"3099",GATEWAY_HOST:"127.0.0.1"}),{client:{session}});
await app.listen({host:"127.0.0.1",port:3099});
console.log("MOCK_LANGCHAIN_GATEWAY_READY");
const shutdown=async()=>{await app.close();process.exit(0)};
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
