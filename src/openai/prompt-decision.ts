import Ajv from "ajv";
import { decodeToolDecision } from "./tool-json.js";

type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
export type FunctionDeclaration = {name:string;parameters:Obj};
export type FunctionChoice = "auto"|"none"|"required"|{name:string};
export type Decision = {kind:"message";content:string;calls:[]} |
  {kind:"tool_calls";content:string;calls:Array<{name:string;arguments:Obj}>};

export class InvalidDecisionError extends Error {
  constructor(message="Invalid model function decision") {
    super(message); this.name="InvalidDecisionError";
  }
}

/** Pure, sandbox-independent decision validation. Never runs a function. */
export function validateFunctionDecision(raw:unknown, tools:FunctionDeclaration[], choice:FunctionChoice):Decision {
  const decoded=decodeToolDecision(raw);
  if(!obj(decoded)||!Array.isArray(decoded.calls)||typeof decoded.content!=="string"||
     (decoded.kind!=="message"&&decoded.kind!=="tool_calls"))
    throw new InvalidDecisionError();
  if(decoded.calls.length>16)throw new InvalidDecisionError("Too many function calls");
  const ajv=new Ajv.default({strict:false,allErrors:false});
  const validators=new Map<string,ReturnType<typeof ajv.compile>>();
  for(const fn of tools){
    if(validators.has(fn.name))throw new InvalidDecisionError("Duplicate tool definition");
    try{validators.set(fn.name,ajv.compile(fn.parameters));}
    catch {throw new InvalidDecisionError("Invalid function parameter schema");}
  }
  const calls=decoded.calls.map(c=>{
    if(!obj(c)||typeof c.name!=="string"||!obj(c.arguments))
      throw new InvalidDecisionError();
    const check=validators.get(c.name);
    if(!check||!check(c.arguments))throw new InvalidDecisionError("Disallowed function or arguments");
    if(typeof choice==="object"&&c.name!==choice.name)
      throw new InvalidDecisionError("Wrong selected function");
    return {name:c.name,arguments:c.arguments};
  });
  if((decoded.kind==="tool_calls")!==Boolean(calls.length)||
     (choice==="none"&&calls.length>0)||
     (choice==="required"&&calls.length===0)||
     (typeof choice==="object"&&calls.length===0))
    throw new InvalidDecisionError("Tool choice constraint violated");
  return calls.length?
    {kind:"tool_calls",content:decoded.content,calls}:
    {kind:"message",content:decoded.content,calls:[]};
}

/** Experimental inference helper for externally sandboxed inference only.
 * The caller supplies an inference function; this helper cannot run client or OpenCode tools.
 * Retries are bounded and stop on caller abort. Do not expose as production API without isolation.
 */
export async function generateValidatedDecision(
  infer:(prompt:string, signal?:AbortSignal)=>Promise<unknown>,
  request:{prompt:string;tools:FunctionDeclaration[];choice:FunctionChoice},
  options:{maxAttempts?:number;signal?:AbortSignal}={}
):Promise<Decision> {
  const attempts=Math.min(Math.max(options.maxAttempts??2,1),3);
  const schemaHint='Respond with ONLY JSON: {kind:"message"|"tool_calls",content:string,calls:[{name:string,arguments:object}]}. No markdown or commentary.';
  const instructions='Client owns all function execution. Do not execute any tool. Allowed functions: '+JSON.stringify(request.tools)+
    '. tool_choice: '+JSON.stringify(request.choice)+'. Conversation: '+JSON.stringify(request.prompt);
  let lastError:unknown;
  for(let attempt=0;attempt<attempts;attempt++){
    if(options.signal?.aborted)throw new Error("Decision aborted");
    const correction=attempt?" Prior output was invalid. Return strict JSON only, matching the declared tools and choice.":"";
    try{
      const raw=await infer(schemaHint+" "+instructions+correction,options.signal);
      return validateFunctionDecision(raw,request.tools,request.choice);
    }catch(error){
      if(options.signal?.aborted)throw new Error("Decision aborted");
      lastError=error;
    }
  }
  throw new InvalidDecisionError("Model failed validated decision after "+attempts+" attempts: "+
    (lastError instanceof InvalidDecisionError?lastError.message:"Invalid output"));
}
