# Live free-model compatibility: Gateway tool-control isolation

The following runs exercised **real** `opencode/muse-spark-1.3-contributor-free` inference from GitHub-hosted runners, with no paid fallback.

## Direct OpenCode session baseline

- [SDK × CLI matrix](https://github.com/nanodriver999/opencode-gateway/actions/runs/37990915765): live `MATRIX_OK` responses via SDK 1.1.53 and 1.4.3 against OpenCode CLI 1.18.34 and latest, and via direct HTTP against latest. The pinned CLI HTTP job remained delayed at server launch when this report was recorded.

## Gateway experiments

| Prompt tools | OpenCode server permission | External pinned CLI | External latest CLI | SDK-managed latest |
|---|---|---|---|---|
| Explicit individual `false` flags (production) | Default | HTTP 502 | HTTP 502 | HTTP 502 |
| Empty map `{}` (experimental) | Default | **Real answer succeeded** | **Real answer succeeded** | **Real answer succeeded** |
| Wildcard `{"*":false}` (experimental) | Default | HTTP 502 | HTTP 502 | HTTP 502 |
| Empty map `{}` (experimental) | Deny-all `{"*":"deny"}` | HTTP 502 | inconclusive/server-start wait | HTTP 502 |

Source runs:
- [Explicit false flags](https://github.com/nanodriver999/opencode-gateway/actions/runs/37991468350)
- [Empty map success](https://github.com/nanodriver999/opencode-gateway/actions/runs/37991562443)
- [Wildcard disabled](https://github.com/nanodriver999/opencode-gateway/actions/runs/37991701423)
- [Server deny-all](https://github.com/nanodriver999/opencode-gateway/actions/runs/37991819425)

## Interpretation

The decisive variable is **OpenCode tool configuration**, not just CLI version, SDK version, or managed-vs-external server mode. An empty request tool map permits free model inference, while tested suppression mechanisms produce Gateway 502. The Gateway currently discards structured `result.data.info.error` details, so these 502s do not independently establish the precise provider cause (for example `FreeTierError`).

**Security:** Empty `tools: {}` is *not an acceptable production fix by itself*: OpenCode tools are enabled by default, and the user specifically requires tools to remain client-executed. Do not merge a blanket removal of the explicit tool-deny configuration without a verified alternative isolation mechanism.

The experiments with modified handlers were temporary and are **reverted in the submitted PR**. The manual workflow tests the production-default Gateway modes for future reproduction; all positive results above are preserved in the linked historical Actions logs. A follow-on task must find an enforceable no-internal-tool execution approach compatible with the free provider, such as a permitted no-tool agent or a hardened sandbox with verified tool-blocking. No false E2E green should be claimed.
