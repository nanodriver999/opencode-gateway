const url = "https://opencode.ai/zen/v1/chat/completions";
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: "Bearer public",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "muse-spark-1.3-contributor-free",
    messages: [{role: "user", content: "Reply OK"}],
    max_tokens: 4,
    stream: false,
  }),
  signal: AbortSignal.timeout(25000),
});
let errorType = "none";
let status = response.status;
if (!response.ok) {
  try {
    const data = await response.json();
    errorType = String(data?.error?.type ?? data?.type ?? "unknown").slice(0,80);
  } catch { errorType = "unknown"; }
}
console.log(JSON.stringify({provider: "opencode", model:"muse-spark-1.3-contributor-free",status,errorType}));
if (!response.ok) process.exitCode=1;
