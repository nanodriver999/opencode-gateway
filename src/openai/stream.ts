import { INTERNAL_TOOLS_DISABLED } from "../opencode/tool-policy.js";
import type { OpenCodeRuntime } from "../opencode/client.js";
import { normalizeChatRequest, splitModel } from "./chat-contract.js";
import { randomUUID } from "node:crypto";

export async function* streamChat(runtime: OpenCodeRuntime, body: unknown, provider: string, signal?: AbortSignal, timeoutMs = 60000) {
  const input = normalizeChatRequest({ ...(body as object), stream: false });
  const model = splitModel(input.model, provider);
  const created = await runtime.client.session.create();
  if (created.error || !created.data?.id) throw new Error("Session creation failed");
  const sessionID = created.data.id;
  const id = "chatcmpl-" + randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  const chunk = (delta: { role?: "assistant"; content?: string }, finish_reason: "stop" | null = null) => ({
    id, object: "chat.completion.chunk", created: timestamp, model: input.model,
    choices: [{ index: 0, delta, finish_reason }],
  });
  let iterator: AsyncIterator<any> | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, {once:true});
  if (signal?.aborted) controller.abort();
  try {
    const events = await runtime.client.event.subscribe(undefined, {signal:controller.signal});
    if (!events.stream) throw new Error("OpenCode event stream unavailable");
    iterator = events.stream[Symbol.asyncIterator]();
    const started = await runtime.client.session.promptAsync({
      sessionID, model, ...(input.system ? {system: input.system} : {}),
      parts: input.parts,
      tools: INTERNAL_TOOLS_DISABLED,
    }, {signal:controller.signal});
    if (started.error) throw new Error("OpenCode prompt failed");
    yield chunk({role:"assistant"});
    while (true) {
      if (controller.signal.aborted) throw new Error("Stream cancelled or timed out");
      const event = await iterator.next();
      if (event.done) throw new Error("OpenCode event stream closed unexpectedly");
      const e = event.value;
      if (e.type === "message.part.delta" && e.properties?.sessionID === sessionID &&
          e.properties.field === "text" && typeof e.properties.delta === "string")
        yield chunk({content:e.properties.delta});
      if (e.type === "session.error" && e.properties?.sessionID === sessionID)
        throw new Error("OpenCode model error");
      if (e.type === "session.idle" && e.properties?.sessionID === sessionID) {
        yield chunk({}, "stop");
        return;
      }
    }
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
    controller.abort();
    if (iterator?.return) await Promise.race([iterator.return().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1000))]);
    await runtime.client.session.abort({sessionID}).catch(() => {});
    await runtime.client.session.delete({sessionID}).catch(() => {});
  }
}
