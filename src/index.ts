import { loadConfig } from "./config.js";
import { connectOpenCode } from "./opencode/client.js";
import { createApp } from "./app.js";

const config = loadConfig();
const runtime = await connectOpenCode(config);
const app = createApp(config, runtime);

async function shutdown() {
  await app.close();
  await runtime.close();
}
process.once("SIGINT", () => { void shutdown().finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void shutdown().finally(() => process.exit(0)); });

try {
  await app.listen({ host: config.GATEWAY_HOST, port: config.GATEWAY_PORT });
} catch (error) {
  app.log.error(error);
  await shutdown();
  process.exitCode = 1;
}
