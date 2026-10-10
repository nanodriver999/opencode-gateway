/** Decode a complete JSON tool decision without executing content or accepting prose. */
export function decodeToolDecision(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  if (text.length > 256_000) throw new Error("Tool decision exceeds size limit");
  // Accept a single complete Markdown JSON fence, not arbitrary leading/trailing prose.
  const fence = /^\x60\x60\x60(?:json)?\s*\n([\s\S]*?)\n\x60\x60\x60$/i.exec(text);
  const candidate = fence ? fence[1].trim() : text;
  try { return JSON.parse(candidate); }
  catch { throw new Error("Invalid model JSON"); }
}
