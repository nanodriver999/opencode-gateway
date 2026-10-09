import os
from openai import OpenAI

client = OpenAI(
    base_url=os.getenv("GATEWAY_BASE_URL", "http://127.0.0.1:3000/v1"),
    api_key=os.environ["GATEWAY_API_KEY"],
)
model = os.getenv("E2E_MODEL", "opencode/muse-spark-1.3-contributor-free")
print([m.id for m in client.models.list().data])
response = client.chat.completions.create(
    model=model,
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
