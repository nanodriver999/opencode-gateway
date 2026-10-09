import assert from "node:assert/strict";
const names=["bash","read","write","edit","glob","grep","webfetch","task","apply_patch"];
for (const name of names) {
  const module=await import("../sandbox/.opencode/tools/"+name+".ts");
  let blocked=false;
  try{
    await module.default.execute({
      command:"touch forbidden-output.txt",
      filePath:"protected.txt",
      path:"protected.txt",
      content:"OVERWRITE",
      pattern:"*",
    },{});
  }catch(error){
    blocked=String(error?.message??error).includes("GATEWAY_TOOL_EXECUTION_BLOCKED");
  }
  assert(blocked,"Shadow tool did not explicitly reject execution: "+name);
}
console.log("ALL_SHADOW_TOOLS_REJECT_EXECUTION",names.length);
