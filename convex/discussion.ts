import { vMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { createAgent } from "./agent";
import { agentTypeValidator } from "./schema";

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
			ctx.scheduler.runAfter(0, internal.chatAction.updateThreadTitle, {
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

export const getDiscussionByTreadIdAndUserId = query({
	args: {
		userId: v.string(),
		threadId: v.string(),
	},
	handler: async (ctx, { userId, threadId }) => {
		// Now we query chats for discussions (since discussions are also chats)
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", threadId).eq("userId", userId),
			)
			.unique();

		if (!discussionChat) return null;

		// Get the discussion metadata
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_chatId", (q) => q.eq("chatId", discussionChat._id))
			.unique();

		if (!discussion) return null;

		return {
			...discussionChat,
			discussionMeta: discussion,
		};
	},
});

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
			ctx.scheduler.runAfter(0, api.chatAction.deleteChat, {
				threadId,
			}),
			// Delete the discussion record
			ctx.db.delete(discussion._id),
			// Delete the discussion's chat record
			ctx.db.delete(discussionChat._id),
		]);
	},
});

export const getDiscussionsByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [threads, allDiscussions, allChats] = await Promise.all([
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
		]);

		const { page, ...paginationInfo } = threads;

		// Create a Set of discussion chat IDs for O(1) lookup
		// We exclude discussions from the main chat list since they appear in the canvas

		const chatsByRoomId = allChats.find((chat) => chat.uuid === args.uuid);
		const discussionChatIdFilterByParentChatId = new Set(
			allDiscussions
				.filter((discussion) => discussion.parentChatId === chatsByRoomId?._id)
				.map((discussion) => discussion.chatId),
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
					!!discussionChatIdFilterByParentChatId.has(thread.data._id)
				);
			});

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
	},
});
