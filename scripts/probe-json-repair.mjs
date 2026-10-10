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
