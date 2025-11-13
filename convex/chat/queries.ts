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
 * Get all chats for a user (excludes discussions and learning chats)
 */
export const getChats = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		// Fetch threads, discussions, and all user chats in parallel
		const [threads, allDiscussions, allChats, allLearningChats] =
			await Promise.all([
				ctx.runQuery(components.agent.threads.listThreadsByUserId, {
					userId: args.userId,
					paginationOpts: args.paginationOpts,
				}),
				// Get all discussion records for this user only (security & performance)
				ctx.db
					.query("discussions")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
				// Get all chats for this user (includes both main chats and discussion chats)
				ctx.db
					.query("chats")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
				// Get all learning chats for this user
				ctx.db
					.query("learningChats")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
			]);

		const { page, ...paginationInfo } = threads;

		// Create a Set of discussion chat IDs for O(1) lookup
		// We exclude discussions from the main chat list since they appear in the canvas
		const discussionChatIds = new Set(
			allDiscussions.map((discussion) => discussion.chatId),
		);

		const learningChatIds = new Set(
			allLearningChats.map((learningChat) => learningChat.chatId),
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
					thread.data !== undefined &&
					!discussionChatIds.has(thread.data._id) &&
					!learningChatIds.has(thread.data._id)
				);
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
