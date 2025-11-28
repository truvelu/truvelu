/**
 * ChatMetadata queries
 * Single responsibility: Read operations for chat metadata domain
 * Replaces the old discussions queries with a more generalized approach
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Get chat metadata by linked message ID and user ID
 * Used for finding discussions linked to specific messages
 */
export const getChatMetadataByLinkedMessageId = query({
	args: {
		linkedMessageId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { linkedMessageId, userId }) => {
		// Find the chat metadata by linkedMessageId
		const metadata = await ctx.db
			.query("chatMetadatas")
			.withIndex("by_linkedMessageId_and_userId", (q) =>
				q.eq("linkedMessageId", linkedMessageId).eq("userId", userId),
			)
			.unique();

		if (!metadata) return null;

		// Get the chat and verify ownership
		const chat = await ctx.db.get(metadata.chatId);

		if (!chat || chat.userId !== userId) {
			return null;
		}

		return {
			...chat,
			chatMetadata: metadata,
		};
	},
});

/**
 * Get discussions by parent chat room ID
 * Returns discussion-type chats that are linked to a parent chat
 */
export const getDiscussionsByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [threads, allChats, parentChat] = await Promise.all([
			ctx.runQuery(components.agent.threads.listThreadsByUserId, {
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			}),
			// Get all discussion-type chats for this user
			ctx.db
				.query("chats")
				.withIndex("by_type_and_userId", (q) =>
					q.eq("type", "discussion").eq("userId", args.userId),
				)
				.collect(),
			ctx.db
				.query("chats")
				.withIndex("by_uuid_and_userId", (q) =>
					q.eq("uuid", args.uuid).eq("userId", args.userId),
				)
				.unique(),
		]);

		if (!parentChat) {
			return {
				...threads,
				page: [],
			};
		}

		// Get chat metadata for discussions linked to this parent chat
		const chatMetadatas = await ctx.db
			.query("chatMetadatas")
			.withIndex("by_parentChatId_and_userId", (q) =>
				q.eq("parentChatId", parentChat._id).eq("userId", args.userId),
			)
			.collect();

		const { page, ...paginationInfo } = threads;

		const discussionChatIds = new Set(
			chatMetadatas.map((metadata) => metadata.chatId),
		);

		// Create a Map of threadId -> chat for O(1) lookup
		const chatsByThreadId = new Map(
			allChats.map((chat) => [chat.threadId, chat]),
		);

		// Filter and enrich threads in a single pass
		const enrichedThreads = page
			.filter((thread) => thread.status === "active")
			.map((thread) => ({
				...thread,
				data: chatsByThreadId.get(thread._id),
			}))
			.filter((thread) => {
				// Only include discussions that belong to this parent chat
				return (
					thread.data !== undefined && discussionChatIds.has(thread.data._id)
				);
			});

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
	},
});

/**
 * Get chat metadata by parent chat ID
 */
export const getChatMetadatasByParentChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, { chatId, userId }) => {
		return await ctx.db
			.query("chatMetadatas")
			.withIndex("by_parentChatId_and_userId", (q) =>
				q.eq("parentChatId", chatId).eq("userId", userId),
			)
			.collect();
	},
});

/**
 * Get chat metadata by learning ID
 */
export const getChatMetadatasByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		return await ctx.db
			.query("chatMetadatas")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();
	},
});

/**
 * Get chat metadata by chat ID
 */
export const getChatMetadataByChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, { chatId, userId }) => {
		return await ctx.db
			.query("chatMetadatas")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", chatId).eq("userId", userId),
			)
			.unique();
	},
});

