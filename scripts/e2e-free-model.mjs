import assert from "node:assert/strict";
import OpenAI from "openai";

const candidates = [
  "opencode/big-pickle",
  "opencode/mimo-v2.5-free",
  "opencode/nemotron-3-ultra-free",
  "opencode/ling-3.0-flash-fin-free",
];
const client = new OpenAI({
  baseURL: process.env.GATEWAY_BASE_URL ?? "http://127.0.0.1:3000/v1",
  apiKey: process.env.GATEWAY_API_KEY ?? "local-test",
  timeout: 40000,
  maxRetries: 0,
});
const available = new Set((await client.models.list()).data.map(model => model.id));
console.log("CATALOG", JSON.stringify(candidates.map(model=>({model,listed:available.has(model)}))));
let success = false;
for (const model of candidates) {
  if (!available.has(model)) {
    console.log("SKIP",model,"not in model catalog");
    continue;
  }
  try {
    const answer = await client.chat.completions.create({
      model, messages: [{role:"user",content:"Respond exactly: READY"}],
    });
    assert(answer.choices[0]?.message?.content?.trim(), "Empty chat response");
    console.log("CHAT_OK", model);
    const stream = await client.chat.completions.create({
      model, messages: [{role:"user",content:"Respond exactly: STREAM"}],stream:true,
    });
    let content = "";
    for await (const chunk of stream) content += chunk.choices[0]?.delta?.content ?? "";
    assert(content.trim(), "Empty SSE response");
    console.log("CHAT_AND_SSE_OK",model);
    success = true;
    break;
  } catch(error) {
    console.log("MODEL_FAILED",model,JSON.stringify({
      status: error?.status ?? null,
      code: error?.code ?? null,
      message: String(error?.message ?? error).slice(0,180),
    }));
  }
}
if(!success) {
  console.error("NO_FREE_MODEL_PASSED: no anonymous candidate completed chat and SSE");
  process.exitCode=1;
}
