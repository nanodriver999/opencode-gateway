/** Supported OpenAI Chat Completions subset: single user turn, text/images and JSON Schema output. */
export class ChatInputError extends Error {
  constructor(message: string) { super(message); this.name = "ChatInputError"; }
}
type Obj = Record<string,unknown>;
const object = (value:unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
export type InputPart = {type:"text";text:string} | {type:"file";mime:string;url:string};
export type JsonFormat = {type:"json_schema";schema:Record<string,unknown>};
export interface NormalizedChat {model:string; system?:string;prompt:string;parts:InputPart[];format?:JsonFormat;}

function userContent(value:unknown):InputPart[] {
  if (typeof value === "string") return [{type:"text",text:value}];
  if (!Array.isArray(value) || !value.length) throw new ChatInputError("Invalid message content");
  return value.map((part):InputPart=>{
    if (!object(part)) throw new ChatInputError("Invalid content part");
    if (part.type === "text" && typeof part.text === "string") return {type:"text",text:part.text};
    if (part.type === "image_url") {
      const url = typeof part.image_url === "string" ? part.image_url :
        object(part.image_url) && typeof part.image_url.url === "string" ? part.image_url.url : undefined;
      if (!url) throw new ChatInputError("Image URL missing");
      const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
      if (!match || url.length > 6_000_000) throw new ChatInputError("Only PNG/JPEG/WEBP data URL images up to 6 MB are supported");
      return {type:"file",mime:match[1],url};
    }
    throw new ChatInputError("Unsupported content part type");
  });
}

function textContent(value:unknown):string {
  const parts=userContent(value);
  if (parts.some(x=>x.type!=="text")) throw new ChatInputError("System instructions must be text only");
  return parts.map(x=>(x as {text:string}).text).join("\n");
}

function format(value:unknown):JsonFormat|undefined {
  if (value === undefined) return;
  if (!object(value)) throw new ChatInputError("Invalid response_format");
  if (value.type==="text") return;
  if (value.type==="json_object") return {type:"json_schema",schema:{type:"object"}};
  if (value.type==="json_schema" && object(value.json_schema) && object(value.json_schema.schema))
    return {type:"json_schema",schema:value.json_schema.schema};
  throw new ChatInputError("Unsupported response_format");
}

export function normalizeChatRequest(input:unknown):NormalizedChat {
  if (!object(input)) throw new ChatInputError("Request body must be an object");
  const allowed=new Set(["model","messages","stream","n","response_format"]);
  const unknown=Object.keys(input).filter(k=>!allowed.has(k));
  if (unknown.length) throw new ChatInputError("Unsupported parameter(s): "+unknown.join(", "));
  if (typeof input.model!=="string" || !input.model.trim()) throw new ChatInputError("model is required");
  if (input.stream!==undefined && input.stream!==false) throw new ChatInputError("Streaming must be handled through the SSE route");
  if (input.n!==undefined && input.n!==1) throw new ChatInputError("Only n=1 is supported");
  if (!Array.isArray(input.messages)||!input.messages.length) throw new ChatInputError("messages must be a non-empty array");
  const sys:string[]=[];
  let parts:InputPart[]|undefined;
  for (const msg of input.messages) {
    if (!object(msg) || typeof msg.role!=="string" || !("content" in msg)) throw new ChatInputError("Each message needs role and content");
    if (Object.keys(msg).some(k=>k!=="role" && k!=="content")) throw new ChatInputError("Message metadata is not supported");
    if (msg.role==="system" || msg.role==="developer") {
      if (parts) throw new ChatInputError("Instructions must precede user");
      sys.push(textContent(msg.content));
    } else if (msg.role==="user") {
      if (parts) throw new ChatInputError("Multiple turns are not supported");
      parts=userContent(msg.content);
    } else throw new ChatInputError("Assistant/tool history is not supported yet");
  }
  if (!parts?.length || !parts.some(p=>p.type==="file" || p.text.trim())) throw new ChatInputError("User message is empty");
  const f=format(input.response_format);
  return {
    model:input.model.trim(),...(sys.length?{system:sys.join("\n\n")}:{}),
    prompt:parts.filter(p=>p.type==="text").map(p=>(p as {text:string}).text).join("\n"),
    parts,...(f?{format:f}:{})
  };
}
export function splitModel(model:string,defaultProvider:string):{providerID:string;modelID:string} {
  const slash=model.indexOf("/");
  const providerID=slash<0?defaultProvider:model.slice(0,slash);
  const modelID=slash<0?model:model.slice(slash+1);
  if(!providerID || !modelID) throw new ChatInputError("Invalid model ID");
  return {providerID,modelID};
}
export interface ChatResult {
  info:{error?:unknown;finish?:string;structured?:unknown;tokens?:{input?:number;output?:number}};
  parts:Array<{type:string;text?:string}>;
}
export function toChatCompletion(model:string,result:ChatResult,id:string,created:number) {
  const text=result.info.structured!==undefined ? JSON.stringify(result.info.structured) :
    result.parts.filter(p=>p.type==="text" && typeof p.text==="string").map(p=>p.text).join("");
  const input=result.info.tokens?.input??0, output=result.info.tokens?.output??0;
  return {
    id,object:"chat.completion" as const,created,model,
    choices:[{index:0,message:{role:"assistant" as const,content:text},
      finish_reason:result.info.finish==="length"?"length" as const:"stop" as const,logprobs:null}],
    usage:{prompt_tokens:input,completion_tokens:output,total_tokens:input+output},
    system_fingerprint:null,
  };
}
