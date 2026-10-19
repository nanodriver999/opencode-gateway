import assert from "node:assert/strict";
import {classifyRuntimeProbe,parseProbeLog} from "./runtime-probe-evidence.mjs";
const cases=[
  [{pluginLoaded:true,blockedTools:["bash"]},"pass","RUNTIME_BASH_BLOCK_MARKER"],
  [{pluginLoaded:true,providerStatus:403,providerErrorKind:"FREE_TIER_RESTRICTED"},"inconclusive","PROVIDER_REJECTED_BEFORE_DISPATCH"],
  [{pluginLoaded:true},"inconclusive","NO_RUNTIME_DISPATCH_EVIDENCE"],
  [{pluginLoaded:true,blockedTools:["bash"],providerStatus:403,providerErrorKind:"FREE_TIER_RESTRICTED"},"inconclusive","PROVIDER_REJECTED_BEFORE_DISPATCH"],
  [{pluginLoaded:true,blockedTools:["bash"],providerStatus:502,providerErrorKind:"OTHER"},"inconclusive","UPSTREAM_ERROR_PRESENT"],
  [{pluginLoaded:false,blockedTools:["bash"]},"fail","PLUGIN_NOT_LOADED"],
  [{pluginLoaded:true,blockedTools:["bash"],sideEffects:true},"fail","SIDE_EFFECT_DETECTED"],
];
for(const [args,status,reason] of cases) assert.deepEqual(classifyRuntimeProbe(args),{status,reason});
const log='GATEWAY_DENY_PLUGIN_LOADED\nGATEWAY_TOOL_ATTEMPT_BLOCKED {"tool":"bash","sessionID":"s"}\n';
assert.equal(classifyRuntimeProbe(parseProbeLog(log)).status,"pass");
const rejected='GATEWAY_DENY_PLUGIN_LOADED\nRUNTIME_TOOL_PROBE_RESPONSE_RECEIVED {"parts":[],"errorStatus":403,"errorKind":"FREE_TIER_RESTRICTED"}\n';
assert.equal(classifyRuntimeProbe(parseProbeLog(rejected)).status,"inconclusive");
assert.equal(classifyRuntimeProbe(parseProbeLog('GATEWAY_DENY_PLUGIN_LOADED\nGATEWAY_TOOL_ATTEMPT_BLOCKED {bad')).status,"inconclusive");
console.log("RUNTIME_PROBE_EVIDENCE_CLASSIFIER_OK");
