/**
 * URL to Map mutations
 * Single responsibility: Write operations for URL to map domain
 * Renamed from mappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { _getOrThrowLearning } from "../learning/helpers";
import { _getOrThrowPlan } from "../plan/helpers";
import { processStatusValidator } from "../schema";
import { _getOrThrowUrlToMap } from "./helpers";

/**
 * Create or update a URL to map for a plan
 * Now includes learningId from the plan
 * Returns the ID of the created/updated record
 */
export const upsertUrlToMapForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		url: v.string(),
		limit: v.optional(v.number()),
		search: v.optional(v.string()),
		ignoreSitemap: v.optional(v.boolean()),
		includeSubdomains: v.optional(v.boolean()),
		mapStatus: v.optional(processStatusValidator),
	},
	handler: async (ctx, args) => {
		// Verify plan ownership and get learningId
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Check if this URL already exists for this plan
		const existing = await ctx.db
			.query("urlToMap")
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
				mapStatus: args.mapStatus,
			});
			return existing._id;
		}

		// Create new record with learningId from plan
		return await ctx.db.insert("urlToMap", {
			planId: args.planId,
			learningId: plan.learningId, // Include learningId from plan
			userId: args.userId,
			url: args.url,
			limit: args.limit,
			search: args.search,
			ignoreSitemap: args.ignoreSitemap,
			includeSubdomains: args.includeSubdomains,
			mapStatus: {
				type: "draft",
			},
		});
	},
});

/**
 * Create or update a URL to map for a learning
 * Returns the ID of the created/updated record
 */
export const upsertUrlToMapForLearning = mutation({
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
			.query("urlToMap")
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
		return await ctx.db.insert("urlToMap", {
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
 * Batch upsert URL to map entries for a plan
 * Now includes learningId from the plan
 */
export const upsertUrlToMapForPlanBatch = mutation({
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
		urlToMapIds: v.array(v.id("urlToMap")),
	}),
	handler: async (ctx, args) => {
		// Verify plan ownership and get learningId
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		const urlToMapIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if this URL already exists for this plan
				const existing = await ctx.db
					.query("urlToMap")
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
				return await ctx.db.insert("urlToMap", {
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

		return { urlToMapIds };
	},
});

export const updateUrlToMapStatus = mutation({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
		mapStatus: processStatusValidator,
	},
	handler: async (ctx, args) => {
		await _getOrThrowUrlToMap(ctx, {
			urlToMapId: args.urlToMapId,
			userId: args.userId,
		});
		await ctx.db.patch(args.urlToMapId, {
			mapStatus: args.mapStatus,
		});

		return args.urlToMapId;
	},
});

/**
 * Delete a URL to map entry
 */
export const deleteUrlToMap = mutation({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowUrlToMap(ctx, {
			urlToMapId: args.urlToMapId,
			userId: args.userId,
		});

		// Also delete any webSearch entries that reference this URL to map
		const relatedWebSearch = await ctx.db
			.query("webSearch")
			.filter((q) => q.eq(q.field("mappedUrlId"), args.urlToMapId))
			.collect();

		for (const result of relatedWebSearch) {
			await ctx.db.delete(result._id);
		}

		// Delete the URL to map entry
		await ctx.db.delete(args.urlToMapId);

		return null;
	},
});
