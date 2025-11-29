/**
 * Learning queries
 * Single responsibility: Read operations for learning domain
 */

import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";

/**
 * Get all active learnings for a user
 */
export const getLearnings = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learnings")
			.withIndex("by_userId_and_activeStatus", (q) =>
				q.eq("userId", args.userId).eq("activeStatus", "active"),
			)
			.paginate(args.paginationOpts);
	},
});

/**
 * Get learning chats (threads) by room ID - returns chats with type "plan"
 */
export const getLearningsChatPanelsByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		// Fetch threads, and all user chats in parallel
		const [threads, allChats, exactLearningByRoomId] = await Promise.all([
			ctx.runQuery(components.agent.threads.listThreadsByUserId, {
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			}),
			// Get all chats for this user
			ctx.db
				.query("chats")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
			// Get the learning for this room
			ctx.db
				.query("learnings")
				.withIndex("by_uuid_and_userId", (q) =>
					q.eq("uuid", args.uuid).eq("userId", args.userId),
				)
				.unique(),
		]);

		if (!exactLearningByRoomId?._id) {
			return {
				...threads,
				page: threads.page
					.filter((thread) => thread.status === "active")
					.map((thread) => ({
						...thread,
						data: null,
					})),
			};
		}

		// Get all plan-type chats that belong to this learning
		const planChats = allChats.filter((chat) => chat.type === "plan");
		const planChatIds = new Set(planChats.map((c) => c._id));

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
				return thread.data !== undefined && planChatIds.has(thread.data._id);
			});

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
	},
});

/**
 * Get learning by room ID (UUID)
 */
export const getLearningByRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learnings")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * Get learning content by chat ID
 */
export const getLearningContentByChatId = query({
	args: {
		userId: v.string(),
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		// Find the learningContent that has this chatId
		const learningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.collect();

		return learningContents.find((lc) => lc.chatId === args.chatId) ?? null;
	},
});

/**
 * Get learning contents by learning room ID with pagination
 */
export const getLearningChatsContentByLearningRoomId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [learning, allChats] = await Promise.all([
			ctx.db
				.query("learnings")
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

		// Create a Map of chatId -> chat for O(1) lookup
		const chatsById = new Map(allChats.map((chat) => [chat._id, chat]));

		// Get learning contents directly from the consolidated table
		const learningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learning._id).eq("userId", args.userId),
			)
			.paginate(args.paginationOpts);

		const { page: learningContentsPage, ...paginationInfo } = learningContents;

		// Enrich with chat data and learning data
		const sortedLearningContents = learningContentsPage.map((content) => ({
			...content,
			learningData: learning,
			chatData: chatsById.get(content.chatId),
			// Map to the format expected by frontend
			metadata: {
				title: content.title,
				description: content.description,
				learningObjectives: content.learningObjectives,
				priority: content.priority,
				status: content.status,
			},
		}));

		return {
			...paginationInfo,
			page: sortedLearningContents,
		};
	},
});

/**
 * Get learning contents by learning ID with pagination
 */
export const getLearningChatsContentByLearningId = query({
	args: {
		userId: v.string(),
		learningId: v.id("learnings"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [learning, learningContents, allChats] = await Promise.all([
			ctx.db.get(args.learningId),
			ctx.db
				.query("learningContents")
				.withIndex("by_learningId_and_userId", (q) =>
					q.eq("learningId", args.learningId).eq("userId", args.userId),
				)
				.paginate(args.paginationOpts),
			ctx.db
				.query("chats")
				.withIndex("by_type_and_userId", (q) =>
					q.eq("type", "content").eq("userId", args.userId),
				)
				.collect(),
		]);

		const { page: learningContentsPage, ...paginationInfo } = learningContents;

		if (!learning) {
			return {
				page: [],
				...paginationInfo,
			};
		}

		// Create a Map of chatId -> chat for O(1) lookup
		const chatsById = new Map(allChats.map((chat) => [chat._id, chat]));

		// Get learning contents directly from the consolidated table

		// Enrich with chat data and learning data
		const sortedLearningContents = learningContentsPage.map((content) => ({
			...content,
			learningData: learning,
			chatData: chatsById.get(content.chatId),
			// Map to the format expected by frontend
			metadata: {
				title: content.title,
				description: content.description,
				learningObjectives: content.learningObjectives,
				priority: content.priority,
				status: content.status,
			},
		}));

		return {
			...paginationInfo,
			page: sortedLearningContents,
		};
	},
});

/**
 * Retrieves learning contents with draft status and enriches them with related data.
 * Optimized version using the new consolidated schema.
 * Now queries learningRequirements from separate table.
 */
export const getLearningChatsContentByLearningIdThatStatusDraft = query({
	args: {
		userId: v.string(),
		learningId: v.id("learnings"),
	},
	handler: async (ctx, args) => {
		// Get the learning record
		const learning = await ctx.db.get(args.learningId);

		if (!learning) {
			throw new Error("Learning not found");
		}

		// Get all learning contents for this learning with "draft" status (ready type)
		const allLearningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learning._id).eq("userId", args.userId),
			)
			.collect();

		// Filter to only draft status (ready type represents draft)
		const draftLearningContents = allLearningContents.filter(
			(lc) => lc.status?.type === "ready",
		);

		if (draftLearningContents.length === 0) {
			return [];
		}

		// Get chat data for all learning contents
		const chatIds = [...new Set(draftLearningContents.map((lc) => lc.chatId))];
		const allChats = await Promise.all(chatIds.map((id) => ctx.db.get(id)));
		const chatMap = new Map(allChats.map((chat) => [chat?._id, chat]));

		// Get plans for these chats
		const allPlans = await ctx.db
			.query("plans")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.collect();

		const plansByChatId = new Map<string, Doc<"plans">[]>();
		for (const plan of allPlans) {
			if (chatIds.includes(plan.chatId)) {
				if (!plansByChatId.has(plan.chatId)) {
					plansByChatId.set(plan.chatId, []);
				}
				const plansList = plansByChatId.get(plan.chatId);
				if (plansList) {
					plansList.push(plan);
				}
			}
		}

		// Get plan IDs and fetch search results and learning requirements
		const planIds = [
			...new Set(
				Array.from(plansByChatId.values())
					.flat()
					.map((p) => p._id),
			),
		];

		const [allWebSearch, allLearningRequirements] = await Promise.all([
			ctx.db
				.query("webSearch")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
			ctx.db
				.query("learningRequirements")
				.withIndex("by_learningId_and_userId", (q) =>
					q.eq("learningId", args.learningId).eq("userId", args.userId),
				)
				.collect(),
		]);

		const webSearchByPlanId = new Map<string, Doc<"webSearch">[]>();
		for (const result of allWebSearch) {
			if (result.planId && planIds.includes(result.planId)) {
				if (!webSearchByPlanId.has(result.planId)) {
					webSearchByPlanId.set(result.planId, []);
				}
				const resultList = webSearchByPlanId.get(result.planId);
				if (resultList) {
					resultList.push(result);
				}
			}
		}

		// Create a map of planId -> learningRequirements
		const learningRequirementsByPlanId = new Map<
			string,
			Doc<"learningRequirements">
		>();
		for (const lr of allLearningRequirements) {
			learningRequirementsByPlanId.set(lr.planId, lr);
		}

		// Enrich learning contents with related data
		const enrichedLearningContents = draftLearningContents.map(
			(learningContent) => {
				const chatData = chatMap.get(learningContent.chatId);

				const plans = plansByChatId.get(learningContent.chatId) || [];
				const lastPlan = plans.sort(
					(a, b) => b._creationTime - a._creationTime,
				)[0];

				if (!lastPlan) {
					return {
						...learningContent,
						learningData: learning,
						chatData,
						metadata: {
							title: learningContent.title,
							description: learningContent.description,
							learningObjectives: learningContent.learningObjectives,
							priority: learningContent.priority,
							status: learningContent.status,
						},
						planData: null,
						learningRequirementData: null,
						searchQueryData: null,
						webSearchData: null,
					};
				}

				const webSearch = webSearchByPlanId.get(lastPlan._id) || [];
				const lastWebSearch = webSearch.sort(
					(a, b) => b._creationTime - a._creationTime,
				)[0];

				// Get learning requirements from separate table
				const learningRequirements = learningRequirementsByPlanId.get(
					lastPlan._id,
				);

				return {
					...learningContent,
					learningData: learning,
					chatData,
					metadata: {
						title: learningContent.title,
						description: learningContent.description,
						learningObjectives: learningContent.learningObjectives,
						priority: learningContent.priority,
						status: learningContent.status,
					},
					planData: lastPlan,
					// learningRequirements is now from separate table
					learningRequirementData: learningRequirements ?? null,
					// query is embedded in web search results
					searchQueryData: lastWebSearch?.query
						? { query: lastWebSearch.query }
						: null,
					webSearchData: lastWebSearch || null,
				};
			},
		);

		return enrichedLearningContents;
	},
});

/**
 * Check if learning content exists for a given learning
 * Used to determine workflow path (new learning vs continuing learning)
 */
export const hasLearningContent = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		// Get learning by UUID
		const learning = await ctx.db
			.query("learnings")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();

		if (!learning) {
			return false;
		}

		// Check if any learning content exists for this learning (excluding plan type)
		const learningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learning._id).eq("userId", args.userId),
			)
			.collect();

		// Get chat data for these contents
		const contentChats = await Promise.all(
			learningContents.map((lc) => ctx.db.get(lc.chatId)),
		);

		// Filter to content type chats only
		const contentTypeChats = contentChats.filter(
			(chat) => chat?.type === "content",
		);

		return contentTypeChats.length > 0;
	},
});
