import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { createAgent } from "./agent";

export const createLearningPanel = mutation({
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
			ctx.db.insert("plans", {
				title: "New Learning Plan",
				content: "",
				status: "draft",
				userId,
				chatId: _chatId,
			}),
			ctx.db.insert("learningChats", {
				type: "panel",
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

export const createLearningContent = mutation({
	args: {
		learningId: v.id("learning"),
		userId: v.string(),
		data: v.array(
			v.object({
				order: v.number(),
				title: v.string(),
				description: v.string(),
				learningObjectives: v.array(v.string()),
				priority: v.optional(v.union(v.string(), v.null())),
			}),
		),
	},
	handler: async (ctx, args) => {
		const { learningId, userId, data } = args;

		const agent = createAgent({
			agentType: "course-planner",
		});

		const promises = data.map(async (item) => {
			const { threadId } = await agent.createThread(ctx, {
				userId,
				title: item.title,
				summary: item.description ?? "",
			});

			const _chatId = await ctx.db.insert("chats", {
				uuid: uuidv7(),
				threadId,
				userId,
				status: "ready",
			});

			const _learningChatId = await ctx.db.insert("learningChats", {
				type: "content",
				chatId: _chatId,
				learningId,
				userId,
				metadata: {
					plan: {
						order: item?.order,
						title: item?.title,
						description: item?.description ?? "",
						learningObjectives: item?.learningObjectives ?? [],
						priority: item?.priority ?? null,
						status: "draft",
					},
				},
			});

			return _learningChatId;
		});

		const learningChatIds = await Promise.all(promises);

		return {
			learningChatIds,
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

		const learningChatPanelType = allLearningChatsByLearningId.filter(
			(learningChat) => learningChat.type === "panel",
		);
		const learningChatIds = new Set(
			learningChatPanelType.map((learningChat) => learningChat.chatId),
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

export const getLearningChatByChatId = query({
	args: {
		userId: v.string(),
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learningChats")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", args.chatId).eq("userId", args.userId),
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
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
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
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		// SECURITY: Verify ownership before proceeding
		const learning = await ctx.db.get(learningId);
		if (!learning) {
			throw new Error("Learning not found");
		}
		if (learning.userId !== userId) {
			throw new Error("Unauthorized: You don't own this learning");
		}

		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();

		const chatJoinLearningChatIds = learningChats.map(
			(learningChat) => learningChat.chatId,
		);

		const chats = await Promise.all(
			chatJoinLearningChatIds.map((chatId) => ctx.db.get(chatId)),
		);
		const plans = await Promise.all(
			chatJoinLearningChatIds.flatMap((chatId) =>
				ctx.db
					.query("plans")
					.withIndex("by_chatId_and_userId", (q) =>
						q.eq("chatId", chatId).eq("userId", userId),
					)
					.collect(),
			),
		);

		const chatThreadIds = chats.map((chat) => chat?.threadId).filter(Boolean);

		const flatPlans = plans.flat();
		const planIds = flatPlans.map((plan) => plan?._id).filter(Boolean);

		const planItems = await Promise.all(
			planIds.flatMap((planId) =>
				ctx.db
					.query("planItems")
					.withIndex("by_planId", (q) => q.eq("planId", planId))
					.collect(),
			),
		);
		const planMetadata = await Promise.all(
			planIds.flatMap((planId) =>
				ctx.db
					.query("planMetadata")
					.withIndex("by_planId", (q) => q.eq("planId", planId))
					.collect(),
			),
		);

		const flatPlanMetadata = planMetadata.flat();

		const planMetadataIds = flatPlanMetadata
			.map((planMetadata) => planMetadata?._id)
			.filter(Boolean);

		const planMetadataSearchQueries = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataSearchQueries")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);
		const planMetadataSearchResults = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataSearchResults")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);
		const planMetadataLearningRequirements = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataLearningRequirements")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);

		const flatPlanItems = planItems.flat();
		const flatPlanMetadataSearchQueries = planMetadataSearchQueries.flat();
		const flatPlanMetadataSearchResults = planMetadataSearchResults.flat();
		const flatPlanMetadataLearningRequirements =
			planMetadataLearningRequirements.flat();

		// Delete all related records in proper order
		// We delete children before parents to maintain referential integrity
		// Each level can be deleted in parallel, but we wait between levels

		// Level 1: Delete deepest children (planMetadata children)
		await Promise.all([
			...flatPlanMetadataSearchQueries.map((item) => ctx.db.delete(item._id)),
			...flatPlanMetadataSearchResults.map((item) => ctx.db.delete(item._id)),
			...flatPlanMetadataLearningRequirements.map((item) =>
				ctx.db.delete(item._id),
			),
		]);

		// Level 2: Delete planMetadata and planItems (both depend on plans)
		await Promise.all([
			...flatPlanMetadata.map((item) => ctx.db.delete(item._id)),
			...flatPlanItems.map((item) => ctx.db.delete(item._id)),
		]);

		// Level 3: Delete plans
		await Promise.all([...flatPlans.map((plan) => ctx.db.delete(plan._id))]);

		// Level 4: Delete learningChats join records
		await Promise.all([
			...learningChats.map((learningChat) => ctx.db.delete(learningChat._id)),
		]);

		// Level 5: Delete chats and schedule thread deletions
		await Promise.all([
			...chatJoinLearningChatIds.map((chatId) => ctx.db.delete(chatId)),
			// Schedule async thread deletions in the agent component
			// Note: These run asynchronously. If they fail, threads may be orphaned.
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

		// Finally, delete the learning record itself
		await ctx.db.delete(learningId);

		return { success: true };
	},
});

export const getLearningChatsContentByLearningRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [learning, allChats] = await Promise.all([
			ctx.db
				.query("learning")
				.withIndex("by_uuid_and_userId", (q) =>
					q.eq("uuid", args.uuid).eq("userId", args.userId),
				)
				.unique(),
			ctx.db
				.query("chats")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
		]);

		if (!learning) {
			throw new Error("Learning not found");
		}

		// Create a Map of threadId -> chat for O(1) lookup
		const chatsById = new Map(allChats.map((chat) => [chat._id, chat]));

		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learning._id).eq("userId", args.userId),
			)
			.paginate(args.paginationOpts);

		const { page: learningChatsPage, ...paginationInfo } = learningChats;

		const sortedLearningChats = learningChatsPage
			.filter((learningChat) => learningChat.type === "content")
			.map((learningChat) => ({
				...learningChat,
				learningData: learning,
				chatData: chatsById.get(learningChat.chatId),
			}));

		return {
			...paginationInfo,
			page: sortedLearningChats,
		};
	},
});
