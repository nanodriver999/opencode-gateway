/** Fail-closed tool policy for OpenCode model requests.
 * Client-supplied OpenAI function definitions are NOT OpenCode internal tools.
 * Do not replace this with {}: live free-model tests showed that {} can
 * re-enable provider inference while leaving OpenCode execution tools available.
 * An isolated no-execution backend is required before enabling prompt mode.
 */
export const INTERNAL_TOOLS_DISABLED = Object.freeze({
  bash:false,
  edit:false,
  write:false,
  read:false,
  glob:false,
  grep:false,
  webfetch:false,
});
