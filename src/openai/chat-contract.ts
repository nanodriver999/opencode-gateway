/** Supported subset of OpenAI Chat Completions: text-only, non-streaming. */
export class ChatInputError extends Error {
  constructor(message: string) { super(message); this.name = 'ChatInputError'; }
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function textContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && value.every((part) =>
    record(part) && part.type === 'text' && typeof part.text === 'string')) {
    return value.map((part) => (part as { text: string }).text).join('\n');
  }
  throw new ChatInputError('Only plain text message content is supported');
}
export interface NormalizedChat { model: string; system?: string; prompt: string; }

export function normalizeChatRequest(input: unknown): NormalizedChat {
  if (!record(input)) throw new ChatInputError('Request body must be an object');
  const allowed = new Set(['model', 'messages', 'stream', 'n']);
  const unknownKeys = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) throw new ChatInputError('Unsupported parameter(s): '+ unknownKeys.join(', '));
  if (typeof input.model !== 'string' || !input.model.trim()) throw new ChatInputError('model is required');
  if (input.stream !== undefined && input.stream !== false)
    throw new ChatInputError('Streaming is not supported by this endpoint yet');
  if (input.n !== undefined && input.n !== 1) throw new ChatInputError('Only n=1 is supported');
  if (!Array.isArray(input.messages) || input.messages.length === 0)
    throw new ChatInputError('messages must be a non-empty array');
  const system: string[] = [];
  let prompt: string | undefined;
  for (const message of input.messages) {
    if (!record(message) || typeof message.role !== 'string' || !('content' in message))
      throw new ChatInputError('Each message requires role and content');
    if (Object.keys(message).some((key) => key !== 'role' && key !== 'content'))
      throw new ChatInputError('Message metadata is not supported yet');
    if (message.role === 'system' || message.role === 'developer') {
      if (prompt !== undefined) throw new ChatInputError('Instructions must precede the user message');
      system.push(textContent(message.content));
      continue;
    }
    if (message.role !== 'user') throw new ChatInputError('Multi-turn assistant/tool history is not supported yet');
    if (prompt !== undefined) throw new ChatInputError('Multiple user turns are not supported yet');
    prompt = textContent(message.content);
  }
  if (!prompt?.trim()) throw new ChatInputError('A non-empty final user message is required');
  return {model: input.model.trim(), ...(system.length ? {system:system.join('\n\n')} : {}), prompt};
}
export function splitModel(model: string, defaultProvider: string): { providerID: string; modelID: string } {
  const slash = model.indexOf('/');
  const providerID = slash === -1 ? defaultProvider : model.slice(0, slash);
  const modelID = slash === -1 ? model : model.slice(slash + 1);
  if (!providerID || !modelID) throw new ChatInputError('Invalid model ID: expected provider/model');
  return { providerID, modelID };
}
export interface ChatResult {
  info: { error?: unknown; finish?: string; tokens?: { input?: number; output?: number } };
  parts: Array<{ type: string; text?: string }>;
}
export function toChatCompletion(model: string, result: ChatResult, id: string, created: number) {
  const text = result.parts.filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text).join('');
  const input = result.info.tokens?.input ?? 0;
  const output = result.info.tokens?.output ?? 0;
  return {
    id, object: 'chat.completion' as const, created, model,
    choices: [{index: 0, message: {role:'assistant' as const,content:text},
      finish_reason: result.info.finish === 'length' ? 'length' as const : 'stop' as const, logprobs:null}],
    usage: {prompt_tokens:input,completion_tokens:output,total_tokens:input+output},
    system_fingerprint:null,
  };
}
