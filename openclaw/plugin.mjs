const ID = "opencode-gateway";
const preferred = "opencode/muse-spark-1.3-contributor-free";

export function normalizeModels(rows, contextWindow = 8192, maxTokens = 2048) {
  if (!Array.isArray(rows)) throw new Error("Invalid gateway model catalog");
  const seen = new Set();
  return rows.filter(row => {
    if (!row || typeof row.id !== "string" || !row.id.trim() || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).map(row => ({
    id: row.id,
    name: row.id,
    input: ["text"],
    contextWindow,
    maxTokens,
  }));
}

export function buildConfigPatch({ baseUrl, apiKey, models, existingModels = {} }) {
  const allowlist = { ...existingModels };
  for (const model of models) allowlist[ID + "/" + model.id] ??= {};
  return {
    models: {
      mode: "merge",
      providers: {
        [ID]: { baseUrl, api: "openai-completions", apiKey, models },
      },
    },
    agents: { defaults: { models: allowlist } },
  };
}

export function createPlugin(fetcher = fetch) {
  return {
    id: ID,
    name: "OpenCode Gateway",
    register(api) {
      const cfg = api.pluginConfig ?? {};
      const baseUrl = String(cfg.baseUrl || "http://127.0.0.1:3000/v1").replace(/\/$/, "");
      const apiKey = String(cfg.apiKey || process.env.OPENCODE_GATEWAY_API_KEY || "");
      if (!/^https?:\/\//.test(baseUrl)) throw new Error("Invalid OpenCode Gateway URL");
      const contextWindow = cfg.contextWindow || 8192;
      const maxTokens = cfg.maxTokens || 2048;
      const getModels = async () => {
        if (!apiKey) throw new Error("OpenCode Gateway API key is required");
        const result = await fetcher(baseUrl + "/models", {
          headers: {Authorization: "Bearer " + apiKey},
          signal: AbortSignal.timeout(10000),
        });
        if (!result.ok) throw new Error("OpenCode Gateway model request failed: HTTP " + result.status);
        const data = await result.json();
        return normalizeModels(data.data, contextWindow, maxTokens);
      };
      api.registerProvider({
        id: ID,
        label: "OpenCode Gateway",
        auth: [{
          id: "gateway",
          label: "Configured OpenCode Gateway",
          kind: "apiKey",
          run: async () => {
            const models = await getModels();
            if (!models.length) throw new Error("Gateway returned no available models");
            const configPatch = buildConfigPatch({
              baseUrl, apiKey, models, existingModels: api.config?.agents?.defaults?.models,
            });
            const selected = models.find(model => model.id === preferred);
            return {
              profiles: [{
                profileId: ID + ":gateway",
                credential: {type:"api_key",provider:ID,key:apiKey},
              }],
              configPatch,
              ...(selected ? {defaultModel:ID + "/" + selected.id} : {}),
            };
          },
        }],
      });
    },
  };
}

export default createPlugin();
