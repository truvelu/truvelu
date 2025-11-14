/**
 * Learning queries
 * Single responsibility: Read operations for learning domain
 */

import type { GenericQueryCtx } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { DataModel, Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";

/**
 * Helper function to fetch and enrich learning chats with metadata
 * Reduces code duplication between queries
 */
async function enrichLearningChatsWithMetadata(
	ctx: GenericQueryCtx<DataModel>,
	learningChatsPage: Doc<"learningChats">[],
	userId: string,
) {
	// Fetch all chats for these learning chats to check their type
	const chatPromises = learningChatsPage.map(
		async (learningChat) =>
			[learningChat._id, await ctx.db.get(learningChat.chatId)] as const,
	);
	const chats = new Map(await Promise.all(chatPromises));

	// Filter learning chats that have content type chats
	const contentLearningChats = learningChatsPage.filter((learningChat) => {
		const chat = chats.get(learningChat._id);
		return chat?.type === "content";
	});

	// Fetch metadata references for all learning chats
	const metadataPromises = contentLearningChats.map((learningChat) =>
		ctx.db
			.query("learningChatMetadata")
			.withIndex("by_learningChatId_and_userId", (q) =>
				q.eq("learningChatId", learningChat._id).eq("userId", userId),
			)
			.first(),
	);

	const metadataResults = await Promise.all(metadataPromises);

	// Fetch metadata content for all metadata
	const contentPromises = metadataResults
		.filter(
			(metadata): metadata is NonNullable<typeof metadata> =>
				metadata !== null && metadata !== undefined,
		)
		.map((metadata) =>
			ctx.db
				.query("learningChatMetadataContent")
				.withIndex("by_learningChatMetadataId_and_userId", (q) =>
					q.eq("learningChatMetadataId", metadata._id).eq("userId", userId),
				)
				.first(),
		);

	const contentResults = await Promise.all(contentPromises);

	return { contentLearningChats, metadataResults, contentResults };
}

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
			.query("learning")
			.withIndex("by_userId_and_activeStatus", (q) =>
				q.eq("userId", args.userId).eq("activeStatus", "active"),
			)
			.paginate(args.paginationOpts);
	},
});

/**
 * Get learning chats (threads) by room ID
 */
export const getLearningsChatPanelsByRoomId = query({
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

		// Get all chats for learning chats to check their type
		const learningChatChatIds = allLearningChatsByLearningId.map(
			(lc) => lc.chatId,
		);
		const learningChatChats = await Promise.all(
			learningChatChatIds.map((chatId) => ctx.db.get(chatId)),
		);

		// Filter learning chats that have panel type
		const learningChatPanelType = allLearningChatsByLearningId.filter(
			(_learningChat, index) => {
				const chat = learningChatChats[index];
				return chat?.type === "plan";
			},
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
			.query("learning")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * Get learning chat by chat ID
 */
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

/**
 * Get learning chats content by learning room ID with pagination
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

		const { contentLearningChats, metadataResults, contentResults } =
			await enrichLearningChatsWithMetadata(
				ctx,
				learningChatsPage,
				args.userId,
			);

		let contentIndex = 0;
		const sortedLearningChats = contentLearningChats.map(
			(learningChat, index) => {
				const metadata = metadataResults[index];
				const content = metadata ? contentResults[contentIndex++] : null;
				return {
					...learningChat,
					learningData: learning,
					chatData: chatsById.get(learningChat.chatId),
					metadata: content,
				};
			},
		);

		return {
			...paginationInfo,
			page: sortedLearningChats,
		};
	},
});

/**
 * Get learning chats content by learning ID with pagination
 */
export const getLearningChatsContentByLearningId = query({
	args: {
		userId: v.string(),
		learningId: v.id("learning"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [learning, allChats] = await Promise.all([
			ctx.db.get(args.learningId),
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

		const { contentLearningChats, metadataResults, contentResults } =
			await enrichLearningChatsWithMetadata(
				ctx,
				learningChatsPage,
				args.userId,
			);

		let contentIndex = 0;
		const sortedLearningChats = contentLearningChats.map(
			(learningChat, index) => {
				const metadata = metadataResults[index];
				const content = metadata ? contentResults[contentIndex++] : null;
				return {
					...learningChat,
					learningData: learning,
					chatData: chatsById.get(learningChat.chatId),
					metadata: content,
				};
			},
		);

		return {
			...paginationInfo,
			page: sortedLearningChats,
		};
	},
});

/**
 * Retrieves learning chats with draft status and enriches them with related data.
 *
 * OPTIMIZATION APPROACH:
 * - Uses batch fetching strategy to avoid N+1 query problem
 * - Loads all user data once, then uses HashMap lookups for O(1) access
 * - Reduces ~350 queries (for 50 chats) down to just 7 queries total
 */
export const getLearningChatsContentByLearningIdThatStatusDraft = query({
	args: {
		userId: v.string(),
		learningId: v.id("learning"),
	},
	handler: async (ctx, args) => {
		// STEP 1: Get the learning record
		const learning = await ctx.db.get(args.learningId);

		if (!learning) {
			throw new Error("Learning not found");
		}

		// STEP 2: Get all learningChats for this learning
		const allLearningChatsRaw = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learning._id).eq("userId", args.userId),
			)
			.collect();

		// STEP 2a: Filter by content type by checking related chats
		const chatPromises = allLearningChatsRaw.map(
			async (learningChat) =>
				[learningChat._id, await ctx.db.get(learningChat.chatId)] as const,
		);
		const chats = new Map(await Promise.all(chatPromises));

		const allLearningChats = allLearningChatsRaw.filter((learningChat) => {
			const chat = chats.get(learningChat._id);
			return chat?.type === "content";
		});

		// Early return optimization: avoid unnecessary queries if no data
		if (allLearningChats.length === 0) {
			return [];
		}

		// STEP 2b: Get metadata references for these learning chats
		const allMetadata = await ctx.db
			.query("learningChatMetadata")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.collect();

		// Create a map of learningChatId -> metadata
		const metadataByLearningChatId = new Map(
			allMetadata.map((m) => [m.learningChatId, m]),
		);

		// Get all metadata content with draft status
		const allMetadataContent = await ctx.db
			.query("learningChatMetadataContent")
			.withIndex("by_status", (q) => q.eq("status", "draft"))
			.collect();

		// Create a map of learningChatMetadataId -> content
		const contentByMetadataId = new Map(
			allMetadataContent.map((c) => [c.learningChatMetadataId, c]),
		);

		// Filter learningChats that have draft status
		const learningChats = allLearningChats.filter((lc) => {
			const metadata = metadataByLearningChatId.get(lc._id);
			return metadata && contentByMetadataId.has(metadata._id);
		});

		// Create a map for enrichment: learningChatId -> content
		const contentByLearningChatId = new Map<
			string,
			(typeof allMetadataContent)[number]
		>();
		for (const lc of learningChats) {
			const metadata = metadataByLearningChatId.get(lc._id);
			if (metadata) {
				const content = contentByMetadataId.get(metadata._id);
				if (content) {
					contentByLearningChatId.set(lc._id, content);
				}
			}
		}

		// STEP 3: Extract unique chat IDs for batch fetching
		const chatIds = [...new Set(learningChats.map((lc) => lc.chatId))];

		// STEP 4: Batch fetch first layer of related data
		const [allChats, allPlans, allPlanMetadata] = await Promise.all([
			Promise.all(chatIds.map((id) => ctx.db.get(id))),
			ctx.db
				.query("plans")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
			ctx.db
				.query("planMetadata")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
		]);

		// STEP 5: Build HashMap lookup tables for O(1) access
		const chatMap = new Map(allChats.map((chat) => [chat?._id, chat]));

		const plansByChatId = new Map<string, typeof allPlans>();
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

		// STEP 6: Extract plan IDs and build planMetadata lookup
		const planIds = [
			...new Set(
				Array.from(plansByChatId.values())
					.flat()
					.map((p) => p._id),
			),
		];

		const planMetadataByPlanId = new Map<string, typeof allPlanMetadata>();
		for (const metadata of allPlanMetadata) {
			if (planIds.includes(metadata.planId)) {
				if (!planMetadataByPlanId.has(metadata.planId)) {
					planMetadataByPlanId.set(metadata.planId, []);
				}
				const metadataList = planMetadataByPlanId.get(metadata.planId);
				if (metadataList) {
					metadataList.push(metadata);
				}
			}
		}

		const planMetadataIds = allPlanMetadata
			.filter((pm) => planIds.includes(pm.planId))
			.map((pm) => pm._id);

		// STEP 7: Batch fetch second layer of related data
		const [allSearchQueries, allSearchResults, allLearningRequirements] =
			await Promise.all([
				ctx.db
					.query("planMetadataSearchQueries")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
				ctx.db
					.query("planMetadataSearchResults")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
				ctx.db
					.query("planMetadataLearningRequirements")
					.withIndex("by_userId", (q) => q.eq("userId", args.userId))
					.collect(),
			]);

		// STEP 8: Build HashMap lookups for metadata-related data
		const searchQueriesByMetadataId = new Map<
			string,
			typeof allSearchQueries
		>();
		for (const query of allSearchQueries) {
			if (planMetadataIds.includes(query.planMetadataId)) {
				if (!searchQueriesByMetadataId.has(query.planMetadataId)) {
					searchQueriesByMetadataId.set(query.planMetadataId, []);
				}
				const queryList = searchQueriesByMetadataId.get(query.planMetadataId);
				if (queryList) {
					queryList.push(query);
				}
			}
		}

		const searchResultsByMetadataId = new Map<
			string,
			typeof allSearchResults
		>();
		for (const result of allSearchResults) {
			if (planMetadataIds.includes(result.planMetadataId)) {
				if (!searchResultsByMetadataId.has(result.planMetadataId)) {
					searchResultsByMetadataId.set(result.planMetadataId, []);
				}
				const resultList = searchResultsByMetadataId.get(result.planMetadataId);
				if (resultList) {
					resultList.push(result);
				}
			}
		}

		const learningReqsByMetadataId = new Map<
			string,
			typeof allLearningRequirements
		>();
		for (const req of allLearningRequirements) {
			if (planMetadataIds.includes(req.planMetadataId)) {
				if (!learningReqsByMetadataId.has(req.planMetadataId)) {
					learningReqsByMetadataId.set(req.planMetadataId, []);
				}
				const reqList = learningReqsByMetadataId.get(req.planMetadataId);
				if (reqList) {
					reqList.push(req);
				}
			}
		}

		// STEP 9: Enrich learningChats with related data using O(1) HashMap lookups
		const enrichedLearningChats = learningChats.map((learningChat) => {
			const chatData = chatMap.get(learningChat.chatId);
			const metadata = contentByLearningChatId.get(learningChat._id);

			const plans = plansByChatId.get(learningChat.chatId) || [];
			const lastPlan = plans.sort(
				(a, b) => b._creationTime - a._creationTime,
			)[0];

			if (!lastPlan) {
				return {
					...learningChat,
					learningData: learning,
					chatData,
					metadata,
					planData: null,
					planMetadataData: null,
					planMetadataSearchQueryData: null,
					planMetadataSearchResultData: null,
					planMetadataLearningRequirementData: null,
				};
			}

			const planMetadataList = planMetadataByPlanId.get(lastPlan._id) || [];
			const lastPlanMetadata = planMetadataList.sort(
				(a, b) => b._creationTime - a._creationTime,
			)[0];

			if (!lastPlanMetadata) {
				return {
					...learningChat,
					learningData: learning,
					chatData,
					metadata,
					planData: lastPlan,
					planMetadataData: null,
					planMetadataSearchQueryData: null,
					planMetadataSearchResultData: null,
					planMetadataLearningRequirementData: null,
				};
			}

			const searchQueries =
				searchQueriesByMetadataId.get(lastPlanMetadata._id) || [];
			const lastSearchQuery = searchQueries.sort(
				(a, b) => b._creationTime - a._creationTime,
			)[0];

			const searchResults =
				searchResultsByMetadataId.get(lastPlanMetadata._id) || [];
			const lastSearchResult = lastSearchQuery
				? searchResults
						.filter((r) => r.planMetadataSearchQueryId === lastSearchQuery._id)
						.sort((a, b) => b._creationTime - a._creationTime)[0]
				: null;

			const learningReqs =
				learningReqsByMetadataId.get(lastPlanMetadata._id) || [];
			const lastLearningReq = learningReqs.sort(
				(a, b) => b._creationTime - a._creationTime,
			)[0];

			return {
				...learningChat,
				learningData: learning,
				chatData,
				metadata,
				planData: lastPlan,
				planMetadataData: lastPlanMetadata,
				planMetadataSearchQueryData: lastSearchQuery || null,
				planMetadataSearchResultData: lastSearchResult || null,
				planMetadataLearningRequirementData: lastLearningReq || null,
			};
		});

		return enrichedLearningChats;
	},
});
