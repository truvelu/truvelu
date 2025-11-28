/**
 * Chat queries
 * Single responsibility: Read operations for chat domain
 */

import {
	getThreadMetadata,
	listUIMessages,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Get all chats for a user (excludes discussions and learning content chats)
 */
export const getChats = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		// Fetch threads, discussions, and all user chats in parallel
		const [threads, allChats] = await Promise.all([
			ctx.runQuery(components.agent.threads.listThreadsByUserId, {
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			}),
			// Get all chats for this user (includes both main chats and discussion chats)
			ctx.db
				.query("chats")
				.withIndex("by_type_and_userId", (q) =>
					q.eq("type", "main").eq("userId", args.userId),
				)
				.collect(),
		]);

		const { page, ...paginationInfo } = threads;

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
				// Exclude discussions (canvas chats) and learning content chats from main chat list
				return thread.data !== undefined;
			});

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
	},
});

/**
 * Get chat by UUID
 */
export const getChat = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * Get chat by thread ID and user ID
 */
export const getChatByThreadIdAndUserId = query({
	args: {
		userId: v.string(),
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", args.threadId).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * List thread messages with streaming support
 */
export const listThreadMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		const { threadId, streamArgs } = args;
		const streams = await syncStreams(ctx, components.agent, {
			threadId,
			streamArgs,
			includeStatuses: ["streaming", "aborted", "finished"],
		});

		const paginated = await listUIMessages(ctx, components.agent, args);

		return { ...paginated, streams };
	},
});

/**
 * Get thread metadata
 */
export const getMetadata = query({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		return await getThreadMetadata(ctx, components.agent, {
			threadId,
		});
	},
});

/**
 * Get discussion chat by linked message ID
 * Used for finding discussions linked to specific messages
 */
export const getDiscussionByLinkedMessageId = query({
	args: {
		linkedMessageId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { linkedMessageId, userId }) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_linkedMessageId_and_userId", (q) =>
				q.eq("linkedMessageId", linkedMessageId).eq("userId", userId),
			)
			.unique();
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
		const [threads, allDiscussionChats, parentChat] = await Promise.all([
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

		// Filter discussions that belong to this parent chat
		const discussionChatIds = new Set(
			allDiscussionChats
				.filter((chat) => chat.parentChatId === parentChat._id)
				.map((chat) => chat._id),
		);

		const { page, ...paginationInfo } = threads;

		// Create a Map of threadId -> chat for O(1) lookup
		const chatsByThreadId = new Map(
			allDiscussionChats.map((chat) => [chat.threadId, chat]),
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
 * Get chats by parent chat ID
 */
export const getChatsByParentChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, { chatId, userId }) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_parentChatId_and_userId", (q) =>
				q.eq("parentChatId", chatId).eq("userId", userId),
			)
			.collect();
	},
});

/**
 * Get chats by learning ID
 */
export const getChatsByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();
	},
});
