import {describe,expect,it,vi} from "vitest";
import {createPlugin,normalizeModels,buildConfigPatch} from "../openclaw/plugin.mjs";
describe("OpenClaw gateway provider",()=>{
  it("normalizes model catalog without duplicate identifiers",()=>{
    expect(normalizeModels([{id:"opencode/free"},{id:"opencode/free"},{id:""}])).toHaveLength(1);
  });
  it("merges model allowlist without deleting existing entries",()=>{
    const patch=buildConfigPatch({baseUrl:"http://127.0.0.1:3000/v1",apiKey:"key",
      models:[{id:"opencode/free"}],existingModels:{"other/model":{alias:"Other"}}});
    expect(patch.agents.defaults.models["other/model"]).toEqual({alias:"Other"});
    expect(patch.agents.defaults.models["opencode-gateway/opencode/free"]).toEqual({});
  });
  it("registers provider and syncs free model from authenticated gateway",async()=>{
    const fetcher=vi.fn(async(_url,opts)=>({
      ok:true,json:async()=>({data:[{id:"opencode/muse-spark-1.3-contributor-free"}]})
    }));
    const api={pluginConfig:{apiKey:"secret"},config:{agents:{defaults:{models:{}}}},
      registerProvider:vi.fn()};
    createPlugin(fetcher).register(api);
    const provider=api.registerProvider.mock.calls[0][0];
    const result=await provider.auth[0].run();
    expect(result.defaultModel).toBe("opencode-gateway/opencode/muse-spark-1.3-contributor-free");
    expect(result.configPatch.models.providers["opencode-gateway"].api).toBe("openai-completions");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
