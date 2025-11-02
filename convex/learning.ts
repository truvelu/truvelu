import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { createAgent } from "./agent";

export const createLearning = mutation({
	args: {
		userId: v.string(),
		icon: v.optional(v.string()),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const {
			userId,
			title = "New Learning",
			description = "",
			icon = "",
		} = args;

		const agent = createAgent({
			agentType: "learning-generation",
		});

		const [_learningId, { threadId }] = await Promise.all([
			ctx.db.insert("learning", {
				uuid: uuidv7(),
				userId,
				title,
				description,
				icon,
				activeStatus: "active",
			}),
			agent.createThread(ctx, {
				userId,
				title: "Initialize setup for learning",
			}),
		]);

		const _chatId = await ctx.db.insert("chats", {
			uuid: uuidv7(),
			threadId,
			userId,
			status: "ready",
		});

		await Promise.all([
			ctx.db.insert("learningChats", {
				chatId: _chatId,
				learningId: _learningId,
				userId,
			}),
			ctx.scheduler.runAfter(
				0,
				internal.chatAction.generateGreetingMessageForLearnerAsync,
				{
					threadId,
					userId,
					agentType: "learning-generation",
				},
			),
		]);

		const learning = await ctx.db.get(_learningId);

		if (!learning) {
			throw new Error("Failed to create learning");
		}

		return {
			success: true,
			threadId,
			uuid: learning?.uuid,
		};
	},
});

export const getLearnings = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learning")
			.withIndex("by_userId_and_activeStatus", (q) =>
				q.eq("userId", args.userId).eq("activeStatus", "active"),
			)
			.paginate(args.paginationOpts);
	},
});

export const getLearningsChatsByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		// Fetch threads, discussions, and all user chats in parallel
		const [threads, allChats, exactLearningByRoomId] = await Promise.all([
			ctx.runQuery(components.agent.threads.listThreadsByUserId, {
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			}),
			// Get all chats for this user (includes both main chats and discussion chats)
			ctx.db
				.query("chats")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
			// Get all learning for this user
			ctx.db
				.query("learning")
				.withIndex("by_uuid_and_userId", (q) =>
					q.eq("uuid", args.uuid).eq("userId", args.userId),
				)
				.unique(),
		]);

		if (!exactLearningByRoomId) {
			throw new Error("Learning not found");
		}

		const allLearningChatsByLearningId = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q
					.eq("learningId", exactLearningByRoomId?._id)
					.eq("userId", args.userId),
			)
			.collect();

		const { page, ...paginationInfo } = threads;

		const learningChatIds = new Set(
			allLearningChatsByLearningId.map((learningChat) => learningChat.chatId),
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
				learningChatIds: Array.from(learningChatIds),
				chatsByThreadId: Array.from(chatsByThreadId),
			}))
			.filter((thread) => {
				// Exclude discussions (canvas chats) from main chat list
				return (
					thread.data !== undefined && !!learningChatIds.has(thread.data._id)
				);
			});

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
	},
});

export const getLearningByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learning")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();
	},
});

export const updateLearningTitle = mutation({
	args: {
		learningId: v.id("learning"),
		title: v.string(),
	},
	handler: async (ctx, { learningId, title }) => {
		return await ctx.db.patch(learningId, {
			title,
		});
	},
});

export const archiveLearning = mutation({
	args: {
		learningId: v.id("learning"),
	},
	handler: async (ctx, { learningId }) => {
		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId", (q) => q.eq("learningId", learningId))
			.collect();

		const chatJoinLearningChatIds = learningChats.map(
			(learningChat) => learningChat.chatId,
		);

		const chats = await Promise.all(
			chatJoinLearningChatIds.map((chatId) => ctx.db.get(chatId)),
		);
		const chatThreadIds = chats.map((chat) => chat?.threadId).filter(Boolean);

		await Promise.all([
			...chatThreadIds.map((threadId) => {
				if (!threadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					api.learningAction.archiveLearningChat,
					{
						threadId,
					},
				);
			}),
		]);

		return await ctx.db.patch(learningId, {
			activeStatus: "archived",
		});
	},
});

export const deleteLearning = mutation({
	args: {
		learningId: v.id("learning"),
	},
	handler: async (ctx, { learningId }) => {
		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId", (q) => q.eq("learningId", learningId))
			.collect();

		const chatJoinLearningChatIds = learningChats.map(
			(learningChat) => learningChat.chatId,
		);

		const chats = await Promise.all(
			chatJoinLearningChatIds.map((chatId) => ctx.db.get(chatId)),
		);
		const chatThreadIds = chats.map((chat) => chat?.threadId).filter(Boolean);

		await Promise.all([
			...chatJoinLearningChatIds.map((chatId) => ctx.db.delete(chatId)),
			...learningChats.map((learningChat) => ctx.db.delete(learningChat._id)),
			...chatThreadIds.map((threadId) => {
				if (!threadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					api.learningAction.deleteLearningChat,
					{
						threadId,
					},
				);
			}),
		]);

		return await ctx.db.delete(learningId);
	},
});
