import os
from openai import OpenAI

client = OpenAI(
    base_url=os.getenv("GATEWAY_BASE_URL", "http://127.0.0.1:3000/v1"),
    api_key=os.environ["GATEWAY_API_KEY"],
)
for chunk in client.chat.completions.create(
    model=os.getenv("E2E_MODEL", "opencode/muse-spark-1.3-contributor-free"),
    messages=[{"role": "user", "content": "Say hello in one sentence."}],
    stream=True,
):
    print(chunk.choices[0].delta.content or "", end="", flush=True)
print()
