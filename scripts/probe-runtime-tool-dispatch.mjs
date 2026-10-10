/**
 * Research-only: request a REAL OpenCode runtime tool dispatch, not a direct hook call.
 * An explicit prompt is probabilistic; no hook marker means INCONCLUSIVE, not success.
 */
import {createOpencodeClient} from "@opencode-ai/sdk/v2";
const client=createOpencodeClient({baseUrl:"http://127.0.0.1:4096"});
const session=await client.session.create();
if(session.error || !session.data?.id)throw Error("Cannot create runtime probe session");
const id=session.data.id;
console.log("RUNTIME_TOOL_PROBE_SESSION_CREATED");
try {
  const probe=await client.session.prompt({
    sessionID:id,
    model:{providerID:"opencode",modelID:"muse-spark-1.3-contributor-free"},
    system:"You are testing tool dispatch. A bash tool is available. Execute the requested shell command with the bash tool. Do not merely describe or simulate executing it.",
    parts:[{type:"text",text:"Use the bash tool to execute pwd. This is a test of whether the runtime invokes the tool. Do not answer without attempting the tool."}],
    tools:{bash:true,read:false,write:false,edit:false,glob:false,grep:false,webfetch:false,task:false}
  });
  if(probe.error)console.log("RUNTIME_TOOL_PROBE_PROVIDER_ERROR",JSON.stringify({name:probe.error.name??"unknown"}));
  else console.log("RUNTIME_TOOL_PROBE_RESPONSE_RECEIVED",JSON.stringify({parts:probe.data?.parts?.map(p=>({type:p.type,tool:p.tool,state:p.state?.status}))??[],error:probe.data?.info?.error??null,finish:probe.data?.info?.finish??null}));
  try {
    const history=await client.session.messages({sessionID:id});
    console.log("RUNTIME_TOOL_PROBE_HISTORY",JSON.stringify({error:history.error??null,messages:history.data?.map(m=>({role:m.info?.role,error:m.info?.error?.name??null,finish:m.info?.finish??null,parts:m.parts?.map(p=>({type:p.type,tool:p.tool,state:p.state?.status}))}))??[]}));
  } catch(e){console.log("RUNTIME_TOOL_PROBE_HISTORY_UNAVAILABLE",String(e?.message??e).slice(0,200));}
} catch(e) {
  // A hook throwing is an expected possible outcome; evidence must be in server logs.
  console.log("RUNTIME_TOOL_PROBE_REJECTED",String(e?.message??e).slice(0,200));
} finally {
  await client.session.delete({sessionID:id}).catch(()=>{});
}
