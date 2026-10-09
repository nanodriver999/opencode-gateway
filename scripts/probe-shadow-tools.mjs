import assert from "node:assert/strict";
const base="http://127.0.0.1:4096";
async function query(path,init){
 const r=await fetch(base+path,{...init,signal:AbortSignal.timeout(40000)});
 if(!r.ok)throw Error(path+" HTTP "+r.status);
 return r.json();
}
const tools=await query("/experimental/tool/ids").catch(async e=>{
 console.log("TOOL_DISCOVERY_UNAVAILABLE",String(e).slice(0,120));
 return null;
});
if(tools!==null) console.log("SHADOW_TOOL_IDS",JSON.stringify(tools).slice(0,2000));
const created=await query("/session",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
try{
 const msg=await query("/session/"+created.id+"/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
 model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
 parts:[{type:"text",text:"Reply exactly SHADOW_MODEL_OK. Do not use tools."}],
 tools:{}
 })});
 const text=(msg.parts??[]).filter(p=>p.type==="text").map(p=>p.text).join("");
 const error=msg.info?.error;
 console.log("SHADOW_MODEL",JSON.stringify({success:text.includes("SHADOW_MODEL_OK"),errorType:error?.name??error?.data?.type??null,partTypes:(msg.parts??[]).map(p=>p.type)}));
 assert(!error,"Provider error with custom tool registry");
 assert(text.includes("SHADOW_MODEL_OK"),"Actual model output did not match");
}finally{await fetch(base+"/session/"+created.id,{method:"DELETE"}).catch(()=>{});}

const second=await query("/session",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
try {
 const prompt=await query("/session/"+second.id+"/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
   parts:[{type:"text",text:"Use the bash tool to run the command: touch forbidden-output.txt. Do not just describe it. Report the tool result."}],
   tools:{}
 })});
 const toolParts=(prompt.parts??[]).filter(p=>p.type==="tool");
 const states=toolParts.map(p=>({tool:p.tool,status:p.state?.status,output:String(p.state?.output??p.state?.error??"").slice(0,120)}));
 console.log("SHADOW_TOOL_ATTEMPT",JSON.stringify({toolCalls:states,errorType:prompt.info?.error?.name??null}));
} finally {await fetch(base+"/session/"+second.id,{method:"DELETE"}).catch(()=>{});}
