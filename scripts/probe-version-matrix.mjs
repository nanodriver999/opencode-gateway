import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const server=process.env.OPENCODE_URL??"http://127.0.0.1:4096";
const providerID="opencode",modelID="muse-spark-1.3-contributor-free";
const sdkVersion=process.env.SDK_VERSION??"http";
const timeout=AbortSignal.timeout(30000);
let sessionID;
try {
  let result;
  if(sdkVersion==="http"){
    const create=await fetch(server+"/session",{method:"POST",headers:{"content-type":"application/json"},body:"{}",signal:timeout});
    if(!create.ok)throw Error("session.create HTTP "+create.status);
    sessionID=(await create.json()).id;
    const response=await fetch(server+"/session/"+encodeURIComponent(sessionID)+"/message",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({model:{providerID,modelID},parts:[{type:"text",text:"Reply exactly MATRIX_OK"}],tools:{}}),signal:timeout
    });
    if(!response.ok)throw Error("session.prompt HTTP "+response.status);
    result=await response.json();
  }else{
    const mod=await import(process.cwd()+"/sdk-test/node_modules/@opencode-ai/sdk/dist/v2/index.js").catch(async()=>import(process.cwd()+"/sdk-test/node_modules/@opencode-ai/sdk/dist/index.js"));
    const client=mod.createOpencodeClient({baseUrl:server});
    const c=await client.session.create();
    if(c.error||!c.data?.id)throw Error("SDK session create "+JSON.stringify(c.error));
    sessionID=c.data.id;
    const p=await client.session.prompt({sessionID,model:{providerID,modelID},parts:[{type:"text",text:"Reply exactly MATRIX_OK"}],tools:{}});
    if(p.error||!p.data)throw Error("SDK prompt "+JSON.stringify(p.error));
    result=p.data;
  }
  const content=(result.parts??[]).filter(p=>p.type==="text").map(p=>p.text??"").join("");
  const failure=result.info?.error;
  console.log("MATRIX_RESULT",JSON.stringify({cli:process.env.CLI_VERSION,sdk:sdkVersion,outcome:failure?"model_error":content.includes("MATRIX_OK")?"success":"empty_or_unexpected",errorType:failure?.name??failure?.data?.type??null,contentLength:content.length}));
  if(failure||!content.includes("MATRIX_OK"))process.exitCode=1;
}catch(e){
  console.log("MATRIX_RESULT",JSON.stringify({cli:process.env.CLI_VERSION,sdk:sdkVersion,outcome:"exception",error:String(e?.message??e).slice(0,350)}));
  process.exitCode=1;
}finally{
  if(sessionID)await fetch(server+"/session/"+encodeURIComponent(sessionID),{method:"DELETE",signal:AbortSignal.timeout(2500)}).catch(()=>{});
}
