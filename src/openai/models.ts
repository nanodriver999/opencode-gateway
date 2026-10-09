import type { OpenCodeRuntime } from "../opencode/client.js";

/** Models are scoped to providers currently connected to the configured OpenCode server. */
export async function listModels(runtime: OpenCodeRuntime) {
  const response = await runtime.client.provider.list();
  if (response.error || !response.data) throw new Error("OpenCode provider listing failed");
  const connected = new Set(response.data.connected);
  const data = response.data.all
    .filter((provider) => connected.has(provider.id))
    .flatMap((provider) => Object.keys(provider.models).map((id) => ({
      id: provider.id + "/" + id,
      object: "model" as const,
      created: 0,
      owned_by: provider.id,
    })))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { object: "list" as const, data };
}
