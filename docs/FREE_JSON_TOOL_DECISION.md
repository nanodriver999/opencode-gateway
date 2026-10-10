# Free Muse Spark plain-JSON client function decision experiment

GitHub Actions completed a real, credential-free Muse Spark 1.3 smoke test using the OpenCode standalone server:

- [Successful run](https://github.com/nanodriver999/opencode-gateway/actions/runs/38058207631).
- The prompted exact JSON sample was valid on the first attempt.
- **Independent decision test:** given only a function definition, a weather question, a JSON envelope shape, and no supplied exact tool-call answer, the model selected get_weather with city Seoul on its first attempt.
- **Simulated tool return test:** given the client-side weather result sunny, 22C, the model returned a message JSON object with a nonempty natural language answer and no new calls on its first attempt.
- Both steps were generated as **ordinary text** with tools:{} and **without** OpenCode structured JSON schema output.

### Limits

This proves prompt-based JSON selection feasibility in one live synthetic weather example; it is not native OpenAI tool calling, and it does not prove reliability across arbitrary tasks.
The positive run was made with a standalone OpenCode server in a disposable GitHub runner, not through the production Gateway. No real LangChain bind_tools end-to-end loop was executed.
The OpenCode server was not hardened as a production sandbox in the passing standalone run. Empty tools:{} must NOT replace the production Gateway's internal-tool suppression: it may enable OpenCode builtins.
Any future opt-in implementation must validate allowed function names, JSON Schema arguments, and tool-result IDs; bound tokens/time and retries; and enforce process/filesystem/network isolation before accepting untrusted client requests.
No paid model fallback or provider secret was used.

### Development implications

The previous free-provider structured format request failed with a tool_choice restriction, but plain-text JSON envelopes worked for this synthetic case. A future opt-in adapter can test this strategy on a validated isolated inference backend while leaving the secure default unchanged.