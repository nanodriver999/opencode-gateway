/** Research-only deny-all OpenCode hook. Not an operating-system security boundary. */
export const DenyToolExecution = async () => {
  console.log("GATEWAY_DENY_PLUGIN_LOADED");
  return {
    "tool.execute.before": async (input) => {
      console.log("GATEWAY_TOOL_ATTEMPT_BLOCKED", JSON.stringify({tool:input.tool,sessionID:input.sessionID}));
      throw new Error("GATEWAY_INTERNAL_TOOL_EXECUTION_FORBIDDEN");
    }
  };
};
