/**
 * Plan mutations
 * Single responsibility: Write operations for plan domain
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { freeObjectValidator, planStatusValidator } from "../schema";

/**
 * Create or get existing plan metadata
 */
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

/**
 * Upsert plan metadata learning requirements
 */
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
			api.plan.mutations.createOrGetPlanMetadata,
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

/**
 * Upsert plan metadata search queries
 */
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
			api.plan.mutations.createOrGetPlanMetadata,
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

/**
 * Upsert plan metadata search results
 */
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
			api.plan.mutations.createOrGetPlanMetadata,
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

export const updatePlanStatus = internalMutation({
	args: {
		planId: v.id("plans"),
		status: planStatusValidator,
	},
	handler: async (ctx, { planId, status }) => {
		await ctx.db.patch(planId, { status });
	},
});
