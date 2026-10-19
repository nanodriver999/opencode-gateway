/** Classify evidence without treating provider rejection as tool-block success. */
export function classifyRuntimeProbe({pluginLoaded=false,blockedTools=[],providerStatus=null,providerErrorKind=null,sideEffects=false}={}) {
  if(sideEffects) return {status:"fail",reason:"SIDE_EFFECT_DETECTED"};
  if(!pluginLoaded) return {status:"fail",reason:"PLUGIN_NOT_LOADED"};
  if(providerStatus===403 && providerErrorKind==="FREE_TIER_RESTRICTED")
    return {status:"inconclusive",reason:"PROVIDER_REJECTED_BEFORE_DISPATCH"};
  if(providerStatus!==null || (providerErrorKind!==null && providerErrorKind!=="OTHER"))
    return {status:"inconclusive",reason:"UPSTREAM_ERROR_PRESENT"};
  if(blockedTools.includes("bash")) return {status:"pass",reason:"RUNTIME_BASH_BLOCK_MARKER"};
  return {status:"inconclusive",reason:"NO_RUNTIME_DISPATCH_EVIDENCE"};
}
export function parseProbeLog(log) {
  const loaded=/^GATEWAY_DENY_PLUGIN_LOADED$/m.test(log);
  const blockedTools=[...log.matchAll(/^GATEWAY_TOOL_ATTEMPT_BLOCKED\s+(\{[^\n]*\})$/gm)].flatMap((match)=>{
    try {const value=JSON.parse(match[1]);return typeof value.tool==="string"?[value.tool]:[];}catch{return [];}
  });
  const response=log.match(/^RUNTIME_TOOL_PROBE_RESPONSE_RECEIVED\s+(\{[^\n]*\})$/m);
  let status=null,errorKind=null;
  if(response){try{const json=JSON.parse(response[1]);status=json.errorStatus??null;errorKind=json.errorKind??null;}catch{}}
  return {pluginLoaded:loaded,blockedTools,providerStatus:status,providerErrorKind:errorKind};
}
