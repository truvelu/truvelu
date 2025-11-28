/**
 * ChatMetadata mutations
 * Single responsibility: Write operations for chat metadata domain
 * Replaces the old discussions mutations with a more generalized approach
 */

import { vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { createAgent } from "../agent";
import { _createChatService } from "../chat/helpers";
import { agentTypeValidator } from "../schema";

/**
 * Create a new discussion (chat with metadata linking to parent chat and message)
 */
export const createDiscussion = mutation({
	args: {
		parentChatId: v.id("chats"),
		linkedMessageId: v.string(),
		agentType: agentTypeValidator,
		userId: v.string(),
		messages: v.array(vMessage),
	},
	handler: async (
		ctx,
		{ parentChatId, linkedMessageId, messages, agentType, userId },
	) => {
		const firstTitle = "New Discussion";
		const agent = createAgent({ agentType });

		// Create a chat record for this discussion
		const { id: discussionChatId, threadId } = await _createChatService(ctx, {
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
			// Create chat metadata linking this discussion to parent chat and message
			ctx.db.insert("chatMetadatas", {
				chatId: discussionChatId,
				parentChatId,
				linkedMessageId,
				userId,
			}),
		]);

		return { threadId };
	},
});

/**
 * Create chat metadata for a chat
 * More general function for linking chats to various entities
 */
export const createChatMetadata = mutation({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
		parentChatId: v.optional(v.id("chats")),
		linkedMessageId: v.optional(v.string()),
		learningId: v.optional(v.id("learnings")),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("chatMetadatas", {
			chatId: args.chatId,
			userId: args.userId,
			parentChatId: args.parentChatId,
			linkedMessageId: args.linkedMessageId,
			learningId: args.learningId,
		});
	},
});

/**
 * Update chat metadata
 */
export const updateChatMetadata = mutation({
	args: {
		chatMetadataId: v.id("chatMetadatas"),
		userId: v.string(),
		parentChatId: v.optional(v.id("chats")),
		linkedMessageId: v.optional(v.string()),
		learningId: v.optional(v.id("learnings")),
	},
	handler: async (ctx, args) => {
		const metadata = await ctx.db.get(args.chatMetadataId);
		if (!metadata || metadata.userId !== args.userId) {
			throw new Error("Chat metadata not found or unauthorized");
		}

		return await ctx.db.patch(args.chatMetadataId, {
			parentChatId: args.parentChatId,
			linkedMessageId: args.linkedMessageId,
			learningId: args.learningId,
		});
	},
});

/**
 * Delete a discussion (chat metadata and associated chat)
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

		// Find the chat metadata record
		const chatMetadata = await ctx.db
			.query("chatMetadatas")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", discussionChat._id).eq("userId", userId),
			)
			.unique();

		if (!chatMetadata) {
			throw new Error("Chat metadata record not found");
		}

		await Promise.all([
			// Delete the chat metadata record
			ctx.db.delete(chatMetadata._id),
			// Delete the discussion's chat record
			ctx.db.delete(discussionChat._id),
		]);
	},
});

/**
 * Delete chat metadata by ID
 */
export const deleteChatMetadata = internalMutation({
	args: {
		chatMetadataId: v.id("chatMetadatas"),
		userId: v.string(),
	},
	handler: async (ctx, { chatMetadataId, userId }) => {
		const metadata = await ctx.db.get(chatMetadataId);
		if (!metadata || metadata.userId !== userId) {
			throw new Error("Chat metadata not found or unauthorized");
		}

		await ctx.db.delete(chatMetadataId);
	},
});

