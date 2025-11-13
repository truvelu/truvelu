/**
 * Mutations for planMetadata and all its children
 * Single responsibility: Write operations only
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { freeObjectValidator } from "../schema";

/**
 * Upsert learning requirements
 */
export const upsertLearningRequirements = mutation({
	args: {
		planMetadataId: v.id("planMetadata"),
		userId: v.string(),
		topic: v.optional(v.union(v.string(), v.null())),
		userLevel: v.optional(v.union(v.string(), v.null())),
		goal: v.optional(v.union(v.string(), v.null())),
		duration: v.optional(v.union(v.string(), v.null())),
		other: freeObjectValidator,
	},
	handler: async (ctx, args) => {
		const { planMetadataId, userId, ...data } = args;

		const existing = await ctx.db
			.query("planMetadataLearningRequirements")
			.withIndex("by_planMetadataId_and_userId", (q) =>
				q.eq("planMetadataId", planMetadataId).eq("userId", userId),
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, data);
			return existing._id;
		}

		return await ctx.db.insert("planMetadataLearningRequirements", {
			planMetadataId,
			userId,
			...data,
		});
	},
});

/**
 * Upsert search query
 */
export const upsertSearchQuery = mutation({
	args: {
		planMetadataId: v.id("planMetadata"),
		userId: v.string(),
		query: v.string(),
		other: freeObjectValidator,
	},
	handler: async (ctx, args) => {
		const { planMetadataId, userId, query, other } = args;

		// Check if query already exists
		const existing = await ctx.db
			.query("planMetadataSearchQueries")
			.withIndex("by_planMetadataId_and_userId", (q) =>
				q.eq("planMetadataId", planMetadataId).eq("userId", userId),
			)
			.filter((q) => q.eq(q.field("query"), query))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, { other });
			return existing._id;
		}

		return await ctx.db.insert("planMetadataSearchQueries", {
			planMetadataId,
			userId,
			query,
			other,
		});
	},
});

/**
 * Upsert search result
 */
export const upsertSearchResult = mutation({
	args: {
		planMetadataId: v.id("planMetadata"),
		planMetadataSearchQueryId: v.id("planMetadataSearchQueries"),
		userId: v.string(),
		title: v.optional(v.union(v.string(), v.null())),
		url: v.optional(v.union(v.string(), v.null())),
		image: v.optional(v.union(v.string(), v.null())),
		content: v.optional(v.union(v.string(), v.null())),
		publishedDate: v.optional(v.union(v.string(), v.null())),
		score: v.optional(v.union(v.number(), v.null())),
		other: freeObjectValidator,
	},
	handler: async (ctx, args) => {
		const { planMetadataId, planMetadataSearchQueryId, userId, url, ...data } =
			args;

		// Check if result with same URL already exists for this query
		if (url) {
			const existing = await ctx.db
				.query("planMetadataSearchResults")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadataId).eq("userId", userId),
				)
				.filter((q) =>
					q.and(
						q.eq(
							q.field("planMetadataSearchQueryId"),
							planMetadataSearchQueryId,
						),
						q.eq(q.field("url"), url),
					),
				)
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, { url, ...data });
				return existing._id;
			}
		}

		return await ctx.db.insert("planMetadataSearchResults", {
			planMetadataId,
			planMetadataSearchQueryId,
			userId,
			url,
			...data,
		});
	},
});

/**
 * Delete all planMetadata and its children by planId
 */
export const deleteByPlanId = internalMutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadataList = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		if (planMetadataList.length === 0) {
			return { deletedCount: 0 };
		}

		const metadataIds = planMetadataList.map((m) => m._id);

		// Fetch all children
		const [learningRequirements, searchQueries, searchResults] =
			await Promise.all([
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataLearningRequirements")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataSearchQueries")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataSearchResults")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
			]);

		// Delete children first
		await Promise.all([
			...learningRequirements.flat().map((item) => ctx.db.delete(item._id)),
			...searchQueries.flat().map((item) => ctx.db.delete(item._id)),
			...searchResults.flat().map((item) => ctx.db.delete(item._id)),
		]);

		// Delete metadata
		await Promise.all(planMetadataList.map((m) => ctx.db.delete(m._id)));

		return {
			deletedCount: planMetadataList.length,
			childrenDeletedCount:
				learningRequirements.flat().length +
				searchQueries.flat().length +
				searchResults.flat().length,
		};
	},
});

/**
 * Batch delete planMetadata and children by multiple planIds
 */
export const batchDeleteByPlanIds = internalMutation({
	args: {
		planIds: v.array(v.id("plans")),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadataList = await Promise.all(
			args.planIds.flatMap((planId) =>
				ctx.db
					.query("planMetadata")
					.withIndex("by_planId_and_userId", (q) =>
						q.eq("planId", planId).eq("userId", args.userId),
					)
					.collect(),
			),
		);

		const flatMetadata = planMetadataList.flat();
		if (flatMetadata.length === 0) {
			return { deletedCount: 0 };
		}

		const metadataIds = flatMetadata.map((m) => m._id);

		// Fetch all children
		const [learningRequirements, searchQueries, searchResults] =
			await Promise.all([
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataLearningRequirements")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataSearchQueries")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
				Promise.all(
					metadataIds.flatMap((id) =>
						ctx.db
							.query("planMetadataSearchResults")
							.withIndex("by_planMetadataId", (q) => q.eq("planMetadataId", id))
							.collect(),
					),
				),
			]);

		// Delete children first
		await Promise.all([
			...learningRequirements.flat().map((item) => ctx.db.delete(item._id)),
			...searchQueries.flat().map((item) => ctx.db.delete(item._id)),
			...searchResults.flat().map((item) => ctx.db.delete(item._id)),
		]);

		// Delete metadata
		await Promise.all(flatMetadata.map((m) => ctx.db.delete(m._id)));

		return {
			deletedCount: flatMetadata.length,
			childrenDeletedCount:
				learningRequirements.flat().length +
				searchQueries.flat().length +
				searchResults.flat().length,
		};
	},
});
