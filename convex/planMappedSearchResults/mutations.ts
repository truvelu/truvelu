/**
 * Plan Mapped Search Results mutations
 * Single responsibility: Write operations for plan mapped search results domain
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";
import { _getOrThrowPlanMappedSearchResult } from "./helpers";

/**
 * Create or update a mapped search result
 * Returns the ID of the created/updated record
 */
export const upsertPlanMappedSearchResult = mutation({
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
		// Verify plan ownership
		await _getOrThrowPlan(ctx, { planId: args.planId, userId: args.userId });

		// Check if this URL already exists for this plan
		const existing = await ctx.db
			.query("planMappedSearchResults")
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

		// Create new record
		return await ctx.db.insert("planMappedSearchResults", {
			planId: args.planId,
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
 * Batch upsert mapped search results
 */
export const upsertPlanMappedSearchResults = mutation({
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
		mappedSearchResultIds: v.array(v.id("planMappedSearchResults")),
	}),
	handler: async (ctx, args) => {
		// Verify plan ownership
		await _getOrThrowPlan(ctx, { planId: args.planId, userId: args.userId });

		const mappedSearchResultIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if this URL already exists for this plan
				const existing = await ctx.db
					.query("planMappedSearchResults")
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

				// Create new record
				return await ctx.db.insert("planMappedSearchResults", {
					planId: args.planId,
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
export const deletePlanMappedSearchResult = mutation({
	args: {
		mappedSearchResultId: v.id("planMappedSearchResults"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowPlanMappedSearchResult(ctx, {
			mappedSearchResultId: args.mappedSearchResultId,
			userId: args.userId,
		});

		// Also delete any planSearchResults that reference this mapped URL
		const relatedSearchResults = await ctx.db
			.query("planSearchResults")
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
