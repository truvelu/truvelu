import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { freeObjectValidator } from "./schema";

export const createOrGetPlanMetadata = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args): Promise<{ data: Doc<"planMetadata"> | null }> => {
		let planMetadata: Doc<"planMetadata"> | null = null;
		planMetadata = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		if (!planMetadata) {
			const _planMetadataId = await ctx.db.insert("planMetadata", {
				planId: args.planId,
				userId: args.userId,
			});
			planMetadata = await ctx.db.get(_planMetadataId);
		}

		return { data: planMetadata };
	},
});

export const getPlanMetadataDetail = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadata = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		if (!planMetadata) {
			throw new Error(
				`Plan metadata not found, planId: ${args.planId}, userId: ${args.userId}, data: ${JSON.stringify(planMetadata)}`,
			);
		}

		const [
			learningRequirement,
			planMetadataSearchQueries,
			planMetadataSearchResults,
		] = await Promise.all([
			ctx.db
				.query("planMetadataLearningRequirements")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.unique(),
			ctx.db
				.query("planMetadataSearchQueries")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.collect(),
			ctx.db
				.query("planMetadataSearchResults")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.collect(),
		]);

		return {
			data: {
				...planMetadata,
				detail: {
					learningRequirement,
					planMetadataSearchQueries,
					planMetadataSearchResults,
				},
			},
		};
	},
});

export const upsertPlanMetadataLearningRequirements = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.object({
			topic: v.optional(v.union(v.string(), v.null())),
			userLevel: v.optional(v.union(v.string(), v.null())),
			goal: v.optional(v.union(v.string(), v.null())),
			duration: v.optional(v.union(v.string(), v.null())),
			other: freeObjectValidator,
		}),
	},
	handler: async (ctx, args) => {
		const planMetadata = (await ctx.runMutation(
			api.plan.createOrGetPlanMetadata,
			{
				planId: args.planId,
				userId: args.userId,
			},
		)) as { data: Doc<"planMetadata"> | null };

		if (!planMetadata.data) {
			throw new Error("Plan metadata not found");
		}

		const planMetadataId = planMetadata.data._id;

		const learningRequirements = await ctx.db
			.query("planMetadataLearningRequirements")
			.withIndex("by_planMetadataId_and_userId", (q) =>
				q.eq("planMetadataId", planMetadataId).eq("userId", args.userId),
			)
			.unique();

		let learningRequirementsId = learningRequirements?._id;
		const payload = {
			topic: args.data.topic,
			userLevel: args.data.userLevel,
			goal: args.data.goal,
			duration: args.data.duration,
			other: args.data.other,
		};

		if (!learningRequirementsId) {
			learningRequirementsId = await ctx.db.insert(
				"planMetadataLearningRequirements",
				{
					planMetadataId: planMetadataId,
					userId: args.userId,
					...payload,
				},
			);
		} else {
			await ctx.db.patch(learningRequirementsId, {
				...payload,
			});
		}

		return {
			status: 200,
			data: { learningRequirementsId },
			message: "Learning requirements updated successfully",
		};
	},
});

export const upsertPlanMetadataSearchQuery = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.array(
			v.object({
				query: v.string(),
				other: freeObjectValidator,
			}),
		),
	},
	handler: async (ctx, args) => {
		const planMetadata = (await ctx.runMutation(
			api.plan.createOrGetPlanMetadata,
			{
				planId: args.planId,
				userId: args.userId,
			},
		)) as { data: Doc<"planMetadata"> | null };

		if (!planMetadata.data) {
			throw new Error("Plan metadata not found");
		}

		const planMetadataId = planMetadata.data._id;

		const payload = args.data.map((d) => ({
			query: d.query,
			other: d.other,
		}));

		const planMetadataSearchQueries = await Promise.all(
			payload.map(async (query) => {
				return await ctx.db.insert("planMetadataSearchQueries", {
					planMetadataId: planMetadataId,
					userId: args.userId,
					...query,
				});
			}),
		);

		return {
			data: { planMetadataSearchQueries },
		};
	},
});

export const upsertPlanMetadataSearchResult = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.object({
			searchResult: v.array(
				v.object({
					planMetadataSearchQueryId: v.id("planMetadataSearchQueries"),
					title: v.optional(v.union(v.string(), v.null())),
					url: v.optional(v.union(v.string(), v.null())),
					image: v.optional(v.union(v.string(), v.null())),
					content: v.optional(v.union(v.string(), v.null())),
					publishedDate: v.optional(v.union(v.string(), v.null())),
					score: v.optional(v.union(v.number(), v.null())),
				}),
			),
			other: freeObjectValidator,
		}),
	},
	handler: async (ctx, args) => {
		const planMetadata = (await ctx.runMutation(
			api.plan.createOrGetPlanMetadata,
			{
				planId: args.planId,
				userId: args.userId,
			},
		)) as { data: Doc<"planMetadata"> | null };

		if (!planMetadata.data) {
			throw new Error("Plan metadata not found");
		}

		const planMetadataId = planMetadata.data._id;

		const payload = args.data.searchResult?.map((searchResult) => ({
			planMetadataSearchQueryId: searchResult.planMetadataSearchQueryId,
			title: searchResult.title,
			url: searchResult.url,
			image: searchResult.image,
			content: searchResult.content,
			publishedDate: searchResult.publishedDate,
			score: searchResult.score,
			other: args.data.other,
		}));

		const planMetadataSearchResult = await Promise.all(
			payload.map(async (searchResult) => {
				return await ctx.db.insert("planMetadataSearchResults", {
					planMetadataId: planMetadataId,
					userId: args.userId,
					...searchResult,
				});
			}),
		);

		return {
			data: { planMetadataSearchResult },
		};
	},
});

export const getPlanByChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", args.chatId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get the last plan by threadId
 * This is a reusable query to avoid duplication across tools
 */
export const getLastPlanByThreadId = query({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get chat by threadId
		const chat = await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", args.threadId).eq("userId", args.userId),
			)
			.unique();

		if (!chat) {
			throw new Error("Chat not found");
		}

		// Get all plans for this chat
		const plans = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", chat._id).eq("userId", args.userId),
			)
			.collect();

		const lastPlan = plans[plans.length - 1];

		if (!lastPlan) {
			throw new Error("No plan found for this chat");
		}

		return lastPlan;
	},
});
