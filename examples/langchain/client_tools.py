"""Demonstrate client-owned functions; live E2E requires an authenticated gateway."""
import os
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

@tool
def lookup(query: str) -> str:
    """Look up information available in this client application."""
    return "Client result: " + query

llm = ChatOpenAI(
    model="opencode/muse-spark-1.3-contributor-free",
    base_url=os.getenv("GATEWAY_BASE_URL", "http://127.0.0.1:3000/v1"),
    api_key=os.environ["GATEWAY_API_KEY"],
)
answer = llm.bind_tools([lookup]).invoke("Use lookup for Seoul")
print(answer.tool_calls)
# Validate the returned arguments and execute selected calls in this client.
