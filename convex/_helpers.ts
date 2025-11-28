import type { SaveMessagesArgs } from "@convex-dev/agent";
import { v4 as uuidv4 } from "uuid";

export const _createToolResult = (toolName: string, result: string) => {
	const toolResultUUID = `call_${uuidv4().replace(/-/g, "")}`;
	return [
		{
			role: "assistant",
			content: [
				{
					args: {},
					toolCallId: toolResultUUID,
					toolName: toolName,
					type: "tool-call",
				},
			],
		},
		{
			role: "tool",
			content: [
				{
					output: {
						type: "text",
						value: result,
					},
					toolCallId: toolResultUUID,
					toolName: toolName,
					type: "tool-result",
				},
			],
		},
	] as SaveMessagesArgs["messages"];
};
