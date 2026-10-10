import assert from "node:assert/strict";
import {DenyToolExecution} from "../sandbox/.opencode/plugins/deny-tools.js";
const hooks=await DenyToolExecution();
for(const name of ["bash","read","write","edit","glob","grep","webfetch","task","custom_mcp"]){
 let stopped=false;
 try{await hooks["tool.execute.before"]({tool:name,sessionID:"s",callID:"c"},{args:{command:"touch forbidden-output.txt"}});}
 catch(e){stopped=String(e?.message).includes("GATEWAY_INTERNAL_TOOL_EXECUTION_FORBIDDEN");}
 assert(stopped,"Tool was not blocked: "+name);
}
console.log("DENY_PLUGIN_HOOK_ALL_TOOLS_REJECTED");
