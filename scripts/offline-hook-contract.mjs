/** Offline contract test: exercises the registered plugin hook in a simulated dispatcher.
 * This does NOT prove OpenCode runtime calls the hook. No model or credentials needed.
 */
import assert from "node:assert/strict";
import {DenyToolExecution} from "../sandbox/.opencode/plugins/deny-tools.js";
const hooks=await DenyToolExecution();
const before=hooks["tool.execute.before"];
assert.equal(typeof before,"function","missing tool.execute.before");
const executed=[];
async function simulatedDispatcher(tool,args) {
  await before({tool,sessionID:"offline-session",callID:"offline-call"},{args});
  executed.push({tool,args});
}
const cases=[
  ["bash",{command:"pwd"}],["read",{filePath:"/tmp/test"}],
  ["write",{filePath:"/tmp/test",content:"x"}],["edit",{filePath:"/tmp/test"}],
  ["glob",{pattern:"*"}],["grep",{pattern:"secret"}],
  ["webfetch",{url:"https://example.invalid"}],["task",{description:"test"}],
  ["custom_mcp",{query:"test"}]
];
for(const [tool,args] of cases) {
  await assert.rejects(simulatedDispatcher(tool,args),e=>
    e?.message==="GATEWAY_INTERNAL_TOOL_EXECUTION_FORBIDDEN",
    "expected deny-all hook to reject "+tool);
}
assert.deepEqual(executed,[],"dispatcher executed a blocked tool");
console.log("OFFLINE_HOOK_CONTRACT_BLOCKED_"+cases.length+"_TOOLS");
console.log("LIMITATION_SIMULATED_DISPATCH_NOT_REAL_OPENCODE_RUNTIME");
