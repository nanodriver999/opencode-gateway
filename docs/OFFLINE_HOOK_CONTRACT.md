# Offline pre-tool hook contract

Run `node scripts/offline-hook-contract.mjs` with Node.js 22 or newer.

This deterministic, credential-free check constructs the research-only deny plugin and uses a **simulated dispatcher** that invokes `tool.execute.before` before performing any side effects. It verifies the plugin rejects nine categories of tool attempts and that the simulated dispatcher does not execute them.

**Security scope:** A green check proves the hook's JavaScript callback rejects these inputs. It **does not prove** that a real OpenCode execution path invokes the hook, that the plugin is loaded in every session, or that the server's shell API, subprocess, network, filesystem, MCP, and other routes are isolated. The live investigation in PR #34 remains blocked by upstream free-model HTTP 403. Do not remove production's fail-closed internal-tool flags based on this test.

Future acceptance gate: run a real OpenCode dispatcher test with a controllable local inference adapter which emits a tool call; verify an actual runtime invocation marker and no effects in an OS-isolated worker.
