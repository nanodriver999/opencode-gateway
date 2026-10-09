# PR-triggered autonomous development

The workflow `.github/workflows/next-development-pr.yml` listens for **merged** feature PRs targeting `main`, maps the completed stage to the next stage, runs an AI coding agent, executes typecheck/tests/build, commits changes to a new feature branch, and opens a **draft PR**. Nothing auto-merges. Stage 7 ends the chain.

## Required setup

Add repository Actions secret `OPENAI_API_KEY` (Settings > Secrets and variables > Actions). The GitHub Actions workflow relies on the official `openai/codex-action@v1`, which requires an API key and can incur API costs. A ChatGPT subscription is not a substitute for an API key. No paid LLM E2E test fallback is permitted; the specified free E2E model remains `opencode/muse-spark-1.3-contributor-free`.

Repository settings must permit GitHub Actions to create pull requests and grant read/write workflow permissions where required. For the first run, use Actions > Next development PR > Run workflow with stage 3, **after this pipeline PR is merged**. Subsequent stage PR merges trigger successive runs automatically.

## Safety / limitations

- This does not run a perpetual daemon. It is a GitHub event-driven Actions pipeline.
- The workflow fails explicitly if the coding-agent key is missing.
- The agent receives a checked-out trusted `main` and limited workspace permissions.
- All generated code must pass the three CI commands before PR creation.
- Live model E2E requires OpenCode provider access/config and is not assumed to run.
- If GitHub Actions push/PR permissions are blocked, grant the required repository setting or use a narrowly scoped GitHub App token.
- Branch names are deterministic; failed retries on existing branches need human reconciliation rather than force-pushing.
