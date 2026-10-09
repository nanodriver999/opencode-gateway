import OpenAI from "openai";
const model="opencode/muse-spark-1.3-contributor-free";
const client=new OpenAI({apiKey:process.env.GATEWAY_API_KEY,baseURL:"http://127.0.0.1:3000/v1",timeout:35000,maxRetries:0});
try {
  const answer=await client.chat.completions.create({model,messages:[{role:"user",content:"Reply with exactly GATEWAY_LIVE_OK"}]});
  const value=answer.choices[0]?.message?.content??"";
  const success=value.includes("GATEWAY_LIVE_OK");
  console.log("GATEWAY_MATRIX_RESULT",JSON.stringify({variant:process.env.VARIANT,success,contentLength:value.length}));
  if(!success)process.exitCode=1;
} catch(error) {
  console.log("GATEWAY_MATRIX_RESULT",JSON.stringify({variant:process.env.VARIANT,success:false,status:error?.status??null,code:error?.code??null,message:String(error?.message??error).slice(0,140)}));
  process.exitCode=1;
}
