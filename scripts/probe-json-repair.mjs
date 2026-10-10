import assert from "node:assert/strict";
const url="http://127.0.0.1:4096";
async function request(path,body){
 const response=await fetch(url+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
 if(!response.ok) throw Error("OpenCode HTTP "+response.status);
 return response.json();
}
function parse(text) {
 const trimmed=text.trim();
 const fenced=/^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
 return JSON.parse(fenced?fenced[1]:trimmed);
}
const prompts=[
 'Output ONLY valid JSON without markdown. Exactly {"kind":"tool_calls","content":"","calls":[{"name":"get_weather","arguments":{"city":"Seoul"}}]}.',
 'Generate a single JSON object with keys kind,content,calls. Use kind tool_calls, empty content, and one call name get_weather with arguments {"city":"Seoul"}. No explanation or markdown.',
 'Repair your prior response so it is strictly JSON. The required value is {"kind":"tool_calls","content":"","calls":[{"name":"get_weather","arguments":{"city":"Seoul"}}]}. Output JSON only.'
];
let success=false;
for(let i=0;i<prompts.length;i++){
 const session=await request("/session",{});
 try{
  const response=await request("/session/"+session.id+"/message",{
   model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
   parts:[{type:"text",text:prompts[i]}],tools:{}
  });
  const raw=(response.parts??[]).filter(p=>p.type==="text").map(p=>p.text??"").join("");
  const upstream=response.info?.error;
  let parsed;
  try{parsed=parse(raw)}catch{}
  const good=!upstream&&parsed?.kind==="tool_calls"&&parsed.calls?.[0]?.name==="get_weather"&&parsed.calls[0].arguments?.city==="Seoul";
  console.log("REPAIR_ATTEMPT",JSON.stringify({attempt:i+1,good,providerError:upstream?.name??null,rawLength:raw.length,parsed:!!parsed,preview:raw.slice(0,140)}));
  if(good){success=true;break;}
 }finally{await fetch(url+"/session/"+session.id,{method:"DELETE"}).catch(()=>{});}
}
assert(success,"No attempt produced a valid client tool decision");
console.log("FREE_MODEL_JSON_SELECTION_OK");

const steps=[
 {label:"select",question:"Available client function: get_weather({city:string}), which returns weather for a city. User asks: What is the weather in Seoul? Choose the function and arguments. Do not execute it. Respond only with one JSON object: kind=tool_calls, content empty string, calls array of objects with name and arguments."},
 {label:"answer",question:"Previous assistant function call: get_weather({city:Seoul}). Client tool result: sunny, 22 degrees Celsius. Answer the user based on that tool result. Respond only with one JSON object: kind=message, content a brief answer, calls empty array."}
];
for(const step of steps) {
 let ok=false;
 for(let attempt=0;attempt<2;attempt++){
  const session=await request("/session",{});
  try{
   const response=await request("/session/"+session.id+"/message",{
    model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
    parts:[{type:"text",text:step.question+" Strict JSON only, no commentary. Example shape: {\\\"kind\\\":\\\"message\\\",\\\"content\\\":\\\"answer\\\",\\\"calls\\\":[]}. For tool invocation use kind tool_calls and a populated calls array."}],
    tools:{}
   });
   const raw=(response.parts??[]).filter(p=>p.type==="text").map(p=>p.text??"").join("");
   let data;try{data=parse(raw)}catch{}
   ok=step.label==="select" ? data?.kind==="tool_calls"&&data.calls?.[0]?.name==="get_weather"&&data.calls[0].arguments?.city?.toLowerCase()==="seoul":data?.kind==="message"&&typeof data.content==="string"&&data.content.length>0&&Array.isArray(data.calls)&&data.calls.length===0;
   console.log("UNFORCED_CLIENT_TOOL",JSON.stringify({stage:step.label,attempt:attempt+1,ok,parsed:!!data,rawLength:raw.length,providerError:response.info?.error?.name??null,preview:raw.slice(0,160)}));
   if(ok)break;
  }finally{await fetch(url+"/session/"+session.id,{method:"DELETE"}).catch(()=>{});}
 }
 if(!ok){console.error("UNFORCED_CLIENT_TOOL_FAILED",step.label);process.exitCode=1;break;}
}
