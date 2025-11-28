/**
 * Mapped Search Results mutations
 * Single responsibility: Write operations for mapped search results domain
 * Renamed from planMappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { _getOrThrowLearning } from "../learning/helpers";
import { _getOrThrowPlan } from "../plan/helpers";
import { _getOrThrowMappedSearchResult } from "./helpers";

/**
 * Create or update a mapped search result for a plan
 * Now includes learningId from the plan
 * Returns the ID of the created/updated record
 */
export const upsertMappedSearchResultForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		url: v.string(),
		limit: v.optional(v.number()),
		search: v.optional(v.string()),
		ignoreSitemap: v.optional(v.boolean()),
		includeSubdomains: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Verify plan ownership and get learningId
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Check if this URL already exists for this plan
		const existing = await ctx.db
			.query("mappedSearchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("url"), args.url))
			.first();

		if (existing) {
			// Update existing record
			await ctx.db.patch(existing._id, {
				limit: args.limit,
				search: args.search,
				ignoreSitemap: args.ignoreSitemap,
				includeSubdomains: args.includeSubdomains,
			});
			return existing._id;
		}

		// Create new record with learningId from plan
		return await ctx.db.insert("mappedSearchResults", {
			planId: args.planId,
			learningId: plan.learningId, // Include learningId from plan
			userId: args.userId,
			url: args.url,
			limit: args.limit,
			search: args.search,
			ignoreSitemap: args.ignoreSitemap,
			includeSubdomains: args.includeSubdomains,
		});
	},
});

/**
 * Create or update a mapped search result for a learning
 * Returns the ID of the created/updated record
 */
export const upsertMappedSearchResultForLearning = mutation({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
		url: v.string(),
		limit: v.optional(v.number()),
		search: v.optional(v.string()),
		ignoreSitemap: v.optional(v.boolean()),
		includeSubdomains: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Verify learning ownership
		await _getOrThrowLearning(ctx, {
			learningId: args.learningId,
			userId: args.userId,
		});

		// Check if this URL already exists for this learning
		const existing = await ctx.db
			.query("mappedSearchResults")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("url"), args.url))
			.first();

		if (existing) {
			// Update existing record
			await ctx.db.patch(existing._id, {
				limit: args.limit,
				search: args.search,
				ignoreSitemap: args.ignoreSitemap,
				includeSubdomains: args.includeSubdomains,
			});
			return existing._id;
		}

		// Create new record
		return await ctx.db.insert("mappedSearchResults", {
			learningId: args.learningId,
			userId: args.userId,
			url: args.url,
			limit: args.limit,
			search: args.search,
			ignoreSitemap: args.ignoreSitemap,
			includeSubdomains: args.includeSubdomains,
		});
	},
});

/**
 * Batch upsert mapped search results for a plan
 * Now includes learningId from the plan
 */
export const upsertMappedSearchResultsForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.array(
			v.object({
				url: v.string(),
				limit: v.optional(v.number()),
				search: v.optional(v.string()),
				ignoreSitemap: v.optional(v.boolean()),
				includeSubdomains: v.optional(v.boolean()),
			}),
		),
	},
	returns: v.object({
		mappedSearchResultIds: v.array(v.id("mappedSearchResults")),
	}),
	handler: async (ctx, args) => {
		// Verify plan ownership and get learningId
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		const mappedSearchResultIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if this URL already exists for this plan
				const existing = await ctx.db
					.query("mappedSearchResults")
					.withIndex("by_planId_and_userId", (q) =>
						q.eq("planId", args.planId).eq("userId", args.userId),
					)
					.filter((q) => q.eq(q.field("url"), item.url))
					.first();

				if (existing) {
					// Update existing record
					await ctx.db.patch(existing._id, {
						limit: item.limit,
						search: item.search,
						ignoreSitemap: item.ignoreSitemap,
						includeSubdomains: item.includeSubdomains,
					});
					return existing._id;
				}

				// Create new record with learningId from plan
				return await ctx.db.insert("mappedSearchResults", {
					planId: args.planId,
					learningId: plan.learningId, // Include learningId from plan
					userId: args.userId,
					url: item.url,
					limit: item.limit,
					search: item.search,
					ignoreSitemap: item.ignoreSitemap,
					includeSubdomains: item.includeSubdomains,
				});
			}),
		);

		return { mappedSearchResultIds };
	},
});

/**
 * Delete a mapped search result
 */
export const deleteMappedSearchResult = mutation({
	args: {
		mappedSearchResultId: v.id("mappedSearchResults"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowMappedSearchResult(ctx, {
			mappedSearchResultId: args.mappedSearchResultId,
			userId: args.userId,
		});

		// Also delete any searchResults that reference this mapped URL
		const relatedSearchResults = await ctx.db
			.query("searchResults")
			.filter((q) => q.eq(q.field("mappedUrlId"), args.mappedSearchResultId))
			.collect();

		for (const result of relatedSearchResults) {
			await ctx.db.delete(result._id);
		}

		// Delete the mapped search result
		await ctx.db.delete(args.mappedSearchResultId);

		return null;
	},
});
