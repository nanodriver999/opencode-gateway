import OpenAI from "openai";
const model="opencode/muse-spark-1.3-contributor-free";
const client=new OpenAI({apiKey:process.env.GATEWAY_API_KEY,baseURL:"http://127.0.0.1:3000/v1",timeout:60000,maxRetries:0});
const fn={type:"function",function:{name:"get_weather",description:"Look up weather",parameters:{type:"object",properties:{city:{type:"string"}},required:["city"],additionalProperties:false}}};
try{
 const first=await client.chat.completions.create({model,tools:[fn],tool_choice:"required",messages:[{role:"user",content:"Use get_weather for Seoul."}]});
 const call=first.choices[0].message.tool_calls?.[0];
 if(call?.type!=="function"||call.function.name!=="get_weather")throw Error("No client-owned tool call");
 const args=JSON.parse(call.function.arguments);
 if(args.city!=="Seoul")throw Error("Unexpected city: "+JSON.stringify(args));
 console.log("CLIENT_TOOL_SELECTION_OK",JSON.stringify({name:call.function.name,arguments:args}));
 const second=await client.chat.completions.create({model,tools:[fn],tool_choice:"none",messages:[
 {role:"user",content:"Use get_weather for Seoul."},{role:"assistant",content:null,tool_calls:[call]},
 {role:"tool",tool_call_id:call.id,content:"Weather: sunny, 22C"}]});
 const answer=second.choices[0].message.content;
 if(!answer?.trim())throw Error("Empty answer after client result");
 console.log("CLIENT_TOOL_CYCLE_OK",JSON.stringify({length:answer.length,finish:second.choices[0].finish_reason}));
}catch(e){console.error("CLIENT_TOOL_CYCLE_FAILED",JSON.stringify({status:e?.status??null,message:String(e?.message??e).slice(0,220)}));process.exitCode=1;}
