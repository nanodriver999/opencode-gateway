import { randomUUID } from "node:crypto";
import type { OpenCodeRuntime } from "../opencode/client.js";
import { completeToolRequest, prepareToolRequest } from "./client-tools.js";

/** Converts an entire validated tool decision into OpenAI SSE chunks.
 * OpenCode structured JSON decisions currently complete before SSE starts.
 * No client-defined tool is executed by the gateway.
 */
export async function* streamToolRequest(runtime: OpenCodeRuntime, body: unknown, provider: string) {
  prepareToolRequest({ ...(body as object), stream: false });
  const response = await completeToolRequest(runtime, { ...(body as object), stream: false }, provider);
  const { id, model, created } = response;
  const choice = response.choices[0];
  const chunk = (delta: Record<string, unknown>, finish_reason: "stop" | "tool_calls" | null = null) => ({
    id, object: "chat.completion.chunk" as const, model, created,
    choices: [{ index: 0, delta, finish_reason }],
  });
  yield chunk({ role: "assistant", content: choice.finish_reason === "tool_calls" ? null : "" });
  if (choice.message.tool_calls?.length) {
    for (const [index, call] of choice.message.tool_calls.entries()) {
      yield chunk({ tool_calls: [{ index, id: call.id, type: "function",
        function: { name: call.function.name, arguments: "" } }] });
      const args = call.function.arguments;
      for (let i = 0; i < args.length; i += 128) {
        yield chunk({ tool_calls: [{ index, function: { arguments: args.slice(i, i + 128) } }] });
      }
    }
  } else {
    const content = choice.message.content || "";
    for (let i = 0; i < content.length; i += 128)
      yield chunk({ content: content.slice(i, i + 128) });
  }
  yield chunk({}, choice.finish_reason);
}
