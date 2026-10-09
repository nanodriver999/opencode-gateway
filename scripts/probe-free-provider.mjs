const cases=[
  {model:"big-pickle",endpoint:"chat/completions"},
  {model:"nemotron-3-ultra-free",endpoint:"chat/completions"},
  {model:"muse-spark-1.3-contributor-free",endpoint:"responses"},
];
for(const c of cases){
  const url="https://opencode.ai/zen/v1/"+c.endpoint;
  const payload=c.endpoint==="responses"
    ? {model:c.model,input:"Answer READY",max_output_tokens:16}
    : {model:c.model,messages:[{role:"user",content:"Answer READY"}],max_tokens:16};
  try {
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer public"},body:JSON.stringify(payload),signal:AbortSignal.timeout(16000)});
    let data;try{data=await r.json();}catch{data=null;}
    console.log("DIRECT_PROBE",JSON.stringify({model:c.model,endpoint:c.endpoint,status:r.status,errorType:data?.error?.type??data?.type??null,errorCode:data?.error?.code??null,success:r.ok}));
  }catch(e){console.log("DIRECT_PROBE",JSON.stringify({model:c.model,endpoint:c.endpoint,error:String(e?.name??"NetworkError")}));}
}
