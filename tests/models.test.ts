import { describe, it, expect, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { OpenCodeRuntime } from "../src/opencode/client.js";

const config = loadConfig({GATEWAY_API_KEY:"test-key"});
const headers = {authorization:"Bearer test-key"};
function fixture(fails=false) {
  const list = vi.fn().mockResolvedValue(fails?{error:{message:"offline"}}:{
    data:{connected:["opencode"],all:[
      {id:"opencode",models:{"muse-spark-1.3-contributor-free":{}, "other":{}}},
      {id:"unconnected",models:{"paid":{}}},
    ]}});
  const runtime={client:{provider:{list}}} as unknown as OpenCodeRuntime;
  return {app:createApp(config,runtime),list};
}
describe("OpenAI models endpoints",()=>{
  it("lists connected models only",async()=>{
    const {app}=fixture();
    const response=await app.inject({method:"GET",url:"/v1/models",headers});
    expect(response.statusCode).toBe(200);
    const result=response.json();
    expect(result.object).toBe("list");
    expect(result.data.map((m:{id:string})=>m.id)).toEqual(["opencode/muse-spark-1.3-contributor-free","opencode/other"]);
    await app.close();
  });
  it("retrieves a model by full id",async()=>{
    const {app}=fixture();
    const id="opencode/muse-spark-1.3-contributor-free";
    expect((await app.inject({method:"GET",url:"/v1/models/"+id,headers})).json().id).toBe(id);
    expect((await app.inject({method:"GET",url:"/v1/models/missing",headers})).statusCode).toBe(404);
    await app.close();
  });
  it("requires authorization",async()=>{
    const {app,list}=fixture();
    expect((await app.inject({method:"GET",url:"/v1/models"})).statusCode).toBe(401);
    expect(list).not.toHaveBeenCalled();
    await app.close();
  });
  it("returns upstream failure without exposing details",async()=>{
    const {app}=fixture(true);
    expect((await app.inject({method:"GET",url:"/v1/models",headers})).statusCode).toBe(502);
    await app.close();
  });
});
