/**
 * Discussion queries
 * Single responsibility: Read operations for discussion domain
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Get discussion by message ID and user ID
 */
export const getDiscussionByMessageIdAndUserId = query({
	args: {
		messageId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { messageId, userId }) => {
		// First find the discussion by messageId
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageId))
			.unique();

		if (!discussion) return null;

		// Get the discussion's chat and verify ownership
		const discussionChat = await ctx.db.get(discussion.chatId);

		if (!discussionChat || discussionChat.userId !== userId) {
			return null;
		}

		return {
			...discussionChat,
			discussionMeta: discussion,
		};
	},
});

/**
 * Get discussions by room ID
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
			// Get all chats for this user (includes both main chats and discussion chats)
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

		const discussions = await ctx.db
			.query("discussions")
			.withIndex("by_parentChatId_and_userId", (q) =>
				q.eq("parentChatId", parentChat._id).eq("userId", args.userId),
			)
			.collect();

		const { page, ...paginationInfo } = threads;

		const discussionChatIds = new Set(
			discussions.map((discussion) => discussion.chatId),
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
				// Exclude discussions (canvas chats) from main chat list
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

export const getDiscussionByParentChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, { chatId, userId }) => {
		return await ctx.db
			.query("discussions")
			.withIndex("by_parentChatId", (q) => q.eq("parentChatId", chatId))
			.filter((q) => q.eq(q.field("userId"), userId))
			.collect();
	},
});
