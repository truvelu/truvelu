import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import { modelOptionsValidator } from "./schema";

export const streamAsync = internalAction({
	args: {
		promptMessageId: v.string(),
		threadId: v.string(),
		modelKey: modelOptionsValidator,
	},
	handler: async (ctx, { promptMessageId, threadId, modelKey }) => {
		const result = await createChatAgentWithModel({
			modelId: modelKey,
		}).streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{
				saveStreamDeltas: {
					chunking: "word",
					throttleMs: 100,
					returnImmediately: true,
				},
			},
		);

		await result.consumeStream();
	},
});
