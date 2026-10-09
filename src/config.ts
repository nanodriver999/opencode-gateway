import { z } from "zod";

const configSchema = z.object({
  GATEWAY_HOST: z.string().default("127.0.0.1"),
  GATEWAY_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  GATEWAY_API_KEY: z.string().min(1),
  OPENCODE_MODE: z.enum(["managed", "external"]).default("external"),
  OPENCODE_URL: z.string().url().default("http://127.0.0.1:4096"),
  OPENCODE_PROVIDER: z.string().default("opencode"),
  OPENCODE_MODEL: z.string().default("muse-spark-1.3-contributor-free"),
  E2E_PAID_FALLBACK: z.enum(["true", "false"]).default("false"),
});

export type GatewayConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const config = configSchema.parse(env);
  if (config.GATEWAY_HOST !== "127.0.0.1" && config.GATEWAY_HOST !== "localhost" && config.GATEWAY_API_KEY === "replace-with-a-secret") {
    throw new Error("Refusing to expose gateway with example API key");
  }
  return config;
}
