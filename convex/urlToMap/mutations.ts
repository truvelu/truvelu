/**
 * URL to Map mutations
 * Single responsibility: Write operations for URL to map domain
 * Renamed from mappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
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
			publishedStatus: {
				type: "draft",
				date: new Date().toISOString(),
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
			publishedStatus: {
				type: "draft",
				date: new Date().toISOString(),
			},
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
					publishedStatus: {
						type: "draft",
						date: new Date().toISOString(),
					},
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
 * Hard delete a URL to map entry (internal use only - used by publish)
 */
export const hardDeleteUrlToMap = internalMutation({
	args: {
		urlToMapId: v.id("urlToMap"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const urlToMap = await ctx.db.get(args.urlToMapId);
		if (!urlToMap) {
			return null;
		}

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

/**
 * Mark a URL to map entry for deletion (soft delete)
 * The item will be deleted when the user publishes
 */
export const markForDeletion = mutation({
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

		await ctx.db.patch(args.urlToMapId, {
			pendingDelete: true,
		});

		return null;
	},
});

/**
 * Cancel pending deletion of a URL to map entry
 */
export const cancelDeletion = mutation({
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

		await ctx.db.patch(args.urlToMapId, {
			pendingDelete: false,
		});

		return null;
	},
});

/**
 * Create a modified copy of a published URL to map entry
 * The original is kept unchanged, and a new draft is created with replacesId pointing to it
 */
export const createModifiedCopy = mutation({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
		url: v.string(),
		limit: v.optional(v.number()),
		search: v.optional(v.string()),
		ignoreSitemap: v.optional(v.boolean()),
		includeSubdomains: v.optional(v.boolean()),
	},
	returns: v.id("urlToMap"),
	handler: async (ctx, args) => {
		const original = await _getOrThrowUrlToMap(ctx, {
			urlToMapId: args.urlToMapId,
			userId: args.userId,
		});

		// Check if there's already a draft copy for this original
		const existingDraft = await ctx.db
			.query("urlToMap")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", original.planId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("replacesId"), args.urlToMapId))
			.first();

		if (existingDraft) {
			// Update existing draft instead of creating new one
			await ctx.db.patch(existingDraft._id, {
				url: args.url,
				limit: args.limit,
				search: args.search,
				ignoreSitemap: args.ignoreSitemap,
				includeSubdomains: args.includeSubdomains,
				publishedStatus: {
					type: "draft",
					date: new Date().toISOString(),
				},
			});
			return existingDraft._id;
		}

		// Create a new draft copy
		return await ctx.db.insert("urlToMap", {
			planId: original.planId,
			learningId: original.learningId,
			userId: args.userId,
			url: args.url,
			limit: args.limit ?? original.limit,
			search: args.search ?? original.search,
			ignoreSitemap: args.ignoreSitemap ?? original.ignoreSitemap,
			includeSubdomains: args.includeSubdomains ?? original.includeSubdomains,
			mapStatus: original.mapStatus,
			publishedStatus: {
				type: "draft",
				date: new Date().toISOString(),
			},
			replacesId: args.urlToMapId,
		});
	},
});

/**
 * Cancel a modification by deleting the draft copy
 * The original published item remains unchanged
 */
export const cancelModification = mutation({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const draft = await _getOrThrowUrlToMap(ctx, {
			urlToMapId: args.urlToMapId,
			userId: args.userId,
		});

		// Can only cancel modifications on draft copies (items with replacesId)
		if (!draft.replacesId) {
			throw new Error("This item is not a draft modification");
		}

		await ctx.db.delete(args.urlToMapId);

		return null;
	},
});

/**
 * Delete a draft URL to map entry immediately
 * Only works for items that are not yet published
 */
export const deleteDraft = mutation({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const urlToMap = await _getOrThrowUrlToMap(ctx, {
			urlToMapId: args.urlToMapId,
			userId: args.userId,
		});

		// Only allow deletion of draft items
		if (urlToMap.publishedStatus?.type === "published") {
			throw new Error("Cannot directly delete published items. Use markForDeletion instead.");
		}

		// Also delete any webSearch entries that reference this URL to map
		const relatedWebSearch = await ctx.db
			.query("webSearch")
			.filter((q) => q.eq(q.field("mappedUrlId"), args.urlToMapId))
			.collect();

		for (const result of relatedWebSearch) {
			await ctx.db.delete(result._id);
		}

		await ctx.db.delete(args.urlToMapId);

		return null;
	},
});
