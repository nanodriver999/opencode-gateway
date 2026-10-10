type Dict=Record<string,unknown>;
const obj=(v:unknown):v is Dict=>!!v&&typeof v==="object"&&!Array.isArray(v);
export type ProviderFailureCode="provider_free_tier_restricted"|"provider_rate_limited"|"provider_format_unsupported"|"provider_model_error";
export class ProviderFailure extends Error {
  constructor(readonly code:ProviderFailureCode){
    super("OpenCode model request failed");
    this.name="ProviderFailure";
  }
}
/** Classify upstream errors without exposing untrusted provider messages or credentials to clients. */
export function classifyProviderFailure(error:unknown):ProviderFailure {
  const data=obj(error)&&obj(error.data)?error.data:undefined;
  const nested=data&&obj(data.error)?data.error:undefined;
  const descriptor=[obj(error)?error.name:"",obj(error)?error.message:"",data?.name,data?.type,data?.message,nested?.type,nested?.message]
    .filter(x=>typeof x==="string").join(" ").toLowerCase();
  if(descriptor.includes("freetiererror")||descriptor.includes("free tier")||descriptor.includes("free-tier"))
    return new ProviderFailure("provider_free_tier_restricted");
  if(descriptor.includes("ratelimit")||descriptor.includes("rate limit")||descriptor.includes("too many requests"))
    return new ProviderFailure("provider_rate_limited");
  if(descriptor.includes("tool_choice")||descriptor.includes("json_schema")||descriptor.includes("unsupported format"))
    return new ProviderFailure("provider_format_unsupported");
  return new ProviderFailure("provider_model_error");
}
