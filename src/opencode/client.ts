import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk/v2";
import type { GatewayConfig } from "../config.js";

type ExternalClient = ReturnType<typeof createOpencodeClient>;
type ManagedInstance = Awaited<ReturnType<typeof createOpencode>>;

export interface OpenCodeRuntime {
  client: ExternalClient;
  close(): Promise<void>;
}

export async function connectOpenCode(config: GatewayConfig): Promise<OpenCodeRuntime> {
  if (config.OPENCODE_MODE === "external") {
    const client = createOpencodeClient({ baseUrl: config.OPENCODE_URL });
    return { client, close: async () => {} };
  }

  const instance: ManagedInstance = await createOpencode({
    hostname: "127.0.0.1",
    port: 0,
  });
  return {
    client: instance.client,
    close: async () => { instance.server.close(); },
  };
}

export async function verifyOpenCode(runtime: OpenCodeRuntime): Promise<void> {
  const health = await runtime.client.global.health();
  if (health.error || !health.data?.healthy) {
    throw new Error("OpenCode health check failed");
  }
}

export async function verifySessionLifecycle(runtime: OpenCodeRuntime): Promise<void> {
  const created = await runtime.client.session.create();
  if (created.error || !created.data?.id) throw new Error("Failed to create OpenCode session");
  const deleted = await runtime.client.session.delete({ sessionID: created.data.id });
  if (deleted.error) throw new Error("Failed to delete OpenCode session");
}
