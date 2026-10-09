# PR workflow

Code is authored in the ChatGPT development session and pushed to a feature branch. GitHub Actions runs `npm install`, `npm run typecheck`, `npm test`, and `npm run build`; after passing checks, the PR is reviewed and merged.

The former merged-PR-triggered autonomous Codex workflow was intentionally removed. No `OPENAI_API_KEY` secret or separately billed coding-agent invocation is required for this process. GitHub Actions checks do not independently implement new features.

Live model E2E uses only `opencode/muse-spark-1.3-contributor-free` when an authenticated OpenCode service is available. It is distinct from CI unit/integration tests.
