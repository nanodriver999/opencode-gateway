const base="http://127.0.0.1:4096";
async function post(path,body){
 const r=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(50000)});
 if(!r.ok)throw Error(path+" HTTP "+r.status);
 return r.json();
}
for(const mode of ["plain","json_schema"]){
 const session=await post("/session",{});
 try{
  const payload={model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
    parts:[{type:"text",text:"Return only JSON: {\\\"kind\\\":\\\"tool_calls\\\",\\\"content\\\":\\\"\\\",\\\"calls\\\":[{\\\"name\\\":\\\"get_weather\\\",\\\"arguments\\\":{\\\"city\\\":\\\"Seoul\\\"}}]}"}],tools:{}};
  if(mode==="json_schema")payload.format={type:"json_schema",schema:{type:"object",properties:{kind:{type:"string"},content:{type:"string"},calls:{type:"array",items:{type:"object",properties:{name:{type:"string"},arguments:{type:"object"}},required:["name","arguments"]}}},required:["kind","content","calls"]}};
  const result=await post("/session/"+session.id+"/message",payload);
  const error=result.info?.error;const raw=(result.parts??[]).filter(p=>p.type==="text").map(p=>p.text).join("");
  console.log("STRUCTURE_DIAG",JSON.stringify({mode,success:!error,kind:error?.name??error?.data?.type??null,message:String(error?.data?.message??error?.message??"").slice(0,180),textLength:raw.length,structured:result.info?.structured!==undefined}));
 }catch(e){console.log("STRUCTURE_DIAG",JSON.stringify({mode,exception:String(e.message).slice(0,150)}));}
 finally{await fetch(base+"/session/"+session.id,{method:"DELETE"}).catch(()=>{});}
}
