"""Real LangChain ChatOpenAI tool bindings against an HTTP Gateway with mock OpenCode inference."""
import os
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage

@tool
def get_weather(city: str) -> str:
    """Return the current weather for a given city."""
    assert city == "Seoul", city
    return "sunny, 22 C"

model = ChatOpenAI(
    model="opencode/muse-spark-1.3-contributor-free",
    base_url="http://127.0.0.1:3099/v1",
    api_key=os.environ.get("GATEWAY_API_KEY", "integration-test-key"),
    max_retries=0,
)
agent = model.bind_tools([get_weather])
question = HumanMessage(content="What is the weather in Seoul? Use the tool.")
reply = agent.invoke([question])
assert len(reply.tool_calls) == 1, reply.tool_calls
call = reply.tool_calls[0]
assert call["name"] == "get_weather"
assert call["args"] == {"city": "Seoul"}
result = get_weather.invoke(call["args"])
answer = agent.invoke([
    question, reply, ToolMessage(content=result, tool_call_id=call["id"])
])
assert not answer.tool_calls, answer.tool_calls
assert "sunny" in (answer.content or "").lower(), answer.content
print("LANGCHAIN_BIND_TOOLS_FULL_CYCLE_OK")
