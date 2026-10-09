import assert from "node:assert/strict";
import { OpenAI } from "openai";

const model = "opencode/muse-spark-1.3-contributor-free";
const baseURL = process.env.GATEWAY_BASE_URL ?? "http://127.0.0.1:3000/v1";
const apiKey = process.env.GATEWAY_API_KEY;
if (!apiKey) throw new Error("GATEWAY_API_KEY required");
const client = new OpenAI({apiKey,baseURL,timeout:120000,maxRetries:0});

const models = await client.models.list();
assert(models.data.some(item=>item.id===model), "Free model not discoverable");
const completion = await client.chat.completions.create({
  model,messages:[{role:"user",content:"Reply with the single word READY"}],
});
assert(completion.choices[0]?.message?.content?.trim(), "Empty completion");
const streamed = await client.chat.completions.create({
  model,messages:[{role:"user",content:"Reply with the single word STREAM"}],stream:true,
});
let collected="";
for await (const chunk of streamed) collected+=chunk.choices[0]?.delta?.content ?? "";
assert(collected.trim(), "Empty streamed response");
console.log("FREE_MODEL_CHAT_AND_STREAM_OK");
