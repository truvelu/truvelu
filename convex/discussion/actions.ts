import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { createAgent } from "../agent";

/**
 * Delete a discussion
 */
export const deleteDiscussion = action({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		const chat = await ctx.runQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			{
				threadId,
				userId,
			},
		);
		if (!chat) {
			throw new Error("Chat not found");
		}

		await ctx.runMutation(internal.discussion.mutations.deleteDiscussion, {
			threadId,
			userId,
		});
		await agent.deleteThreadSync(ctx, { threadId });
	},
});
