/**
 * Discussion mutations
 * Single responsibility: Write operations for discussion domain
 */

import { vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { createAgent } from "../agent";
import { createChatService } from "../chat/services";
import { agentTypeValidator } from "../schema";

/**
 * Create a new discussion
 */
export const createDiscussion = mutation({
	args: {
		parentChatId: v.id("chats"),
		messageId: v.string(),
		agentType: agentTypeValidator,
		userId: v.string(),
		messages: v.array(vMessage),
	},
	handler: async (
		ctx,
		{ parentChatId, messageId, messages, agentType, userId },
	) => {
		const firstTitle = "New Discussion";
		const agent = createAgent({ agentType });

		// Create a chat record for this discussion
		const { id: discussionChatId, threadId } = await createChatService(ctx, {
			agentType,
			userId,
			type: "discussion",
			title: firstTitle,
		});

		await Promise.all([
			ctx.scheduler.runAfter(0, internal.chat.actions.updateThreadTitle, {
				threadId,
			}),
			agent.saveMessages(ctx, {
				threadId,
				messages,
				userId,
				skipEmbeddings: true,
			}),
			ctx.db.insert("discussions", {
				chatId: discussionChatId,
				parentChatId,
				messageId,
				userId,
			}),
		]);

		return { threadId };
	},
});

/**
 * Delete a discussion
 */
export const deleteDiscussion = internalMutation({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		// Find the discussion's chat by threadId
		const discussionChat = await ctx.runQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			{
				threadId,
				userId,
			},
		);

		if (!discussionChat) {
			throw new Error("Discussion chat not found");
		}

		// Find the discussion record
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_chatId", (q) => q.eq("chatId", discussionChat._id))
			.unique();

		if (!discussion) {
			throw new Error("Discussion record not found");
		}

		await Promise.all([
			// Delete the discussion record
			ctx.db.delete(discussion._id),
			// Delete the discussion's chat record
			ctx.db.delete(discussionChat._id),
		]);
	},
});
