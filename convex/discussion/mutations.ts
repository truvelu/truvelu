/**
 * Discussion mutations
 * Single responsibility: Write operations for discussion domain
 */

import { vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { createAgent } from "../agent";
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
		const { threadId } = await agent.createThread(ctx, {
			userId,
			title: firstTitle,
		});

		// Create a chat record for this discussion
		const discussionChatId = await ctx.db.insert("chats", {
			uuid: uuidv7(),
			threadId,
			userId,
			status: "ready",
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
export const deleteDiscussion = mutation({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		// Find the discussion's chat by threadId
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

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
			// Delete the thread
			ctx.scheduler.runAfter(0, api.chat.actions.deleteChat, {
				threadId,
			}),
			// Delete the discussion record
			ctx.db.delete(discussion._id),
			// Delete the discussion's chat record
			ctx.db.delete(discussionChat._id),
		]);
	},
});
