import { classifyProviderFailure } from "./upstream-errors.js";
import { withDeadline } from "../opencode/deadline.js";
import { randomUUID } from "node:crypto";
import type { OpenCodeRuntime } from "../opencode/client.js";
import { ChatInputError, normalizeChatRequest, splitModel, toChatCompletion } from "./chat-contract.js";

export { ChatInputError };

export async function completeChat(runtime: OpenCodeRuntime, payload: unknown, defaultProvider: string, timeoutMs = 60000) {
  const request = normalizeChatRequest(payload);
  const model = splitModel(request.model, defaultProvider);
  const created = await runtime.client.session.create();
  if (created.error || !created.data?.id) throw new Error("OpenCode session creation failed");
  const sessionID = created.data.id;
  let result;
  try {
    result = await withDeadline(signal => runtime.client.session.prompt({
      sessionID,
      model,
      ...(request.system ? { system: request.system } : {}),
      parts: request.parts,
      ...(request.format ? {format:request.format} : {}),
      tools: { bash: false, edit: false, write: false, read: false, glob: false, grep: false, webfetch: false },
    }, {signal}),timeoutMs);
    if (result.error || !result.data) throw new Error("OpenCode model response failed");
    if (result.data.info.error) throw classifyProviderFailure(result.data.info.error);
    return toChatCompletion(request.model, result.data, "chatcmpl-" + randomUUID().replace(/-/g, ""), Math.floor(Date.now()/1000));
  } finally {
    await runtime.client.session.delete({ sessionID }).catch(() => {});
  }
}
