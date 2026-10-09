import { tool } from "@opencode-ai/plugin";
export default tool({
  description: "Disabled: this gateway never executes filesystem or shell tools.",
  args: {command:tool.schema.string().optional(),filePath:tool.schema.string().optional(),path:tool.schema.string().optional(),pattern:tool.schema.string().optional(),content:tool.schema.string().optional()},
  async execute() { throw new Error("GATEWAY_TOOL_EXECUTION_BLOCKED"); }
});
