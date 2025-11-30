/**
 * WebSearch mutations
 * Single responsibility: Write operations for webSearch domain
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";
import { freeObjectValidator } from "../schema";
import { _createWebSearch, _getOrThrowWebSearch } from "./helpers";

/**
 * Upsert web search results for a plan
 * Creates or updates web search entries with optional query embedded
 */
export const upsertForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.array(
			v.object({
				query: v.optional(v.string()),
				title: v.optional(v.string()),
				url: v.optional(v.string()),
				image: v.optional(v.string()),
				content: v.optional(v.string()),
				publishedDate: v.optional(v.string()),
				score: v.optional(v.number()),
				other: freeObjectValidator,
			}),
		),
	},
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		const webSearchIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if result with same URL already exists
				if (item.url) {
					const existing = await ctx.db
						.query("webSearch")
						.withIndex("by_planId_and_userId", (q) =>
							q.eq("planId", args.planId).eq("userId", args.userId),
						)
						.filter((q) => q.eq(q.field("url"), item.url))
						.first();

					if (existing) {
						await ctx.db.patch(existing._id, {
							query: item.query,
							title: item.title,
							url: item.url,
							image: item.image,
							content: item.content,
							publishedDate: item.publishedDate,
							score: item.score,
							other: item.other,
							searchStatus: {
								type: "success",
							},
						});
						return existing._id;
					}
				}

				return await _createWebSearch(ctx, {
					planId: args.planId,
					learningId: plan.learningId,
					userId: args.userId,
					query: item.query,
					title: item.title,
					url: item.url,
					image: item.image,
					content: item.content,
					publishedDate: item.publishedDate,
					score: item.score,
					other: item.other,
					searchStatus: {
						type: "draft",
					},
					publishedStatus: {
						type: "draft",
						date: new Date().toISOString(),
					},
				});
			}),
		);

		return {
			data: { webSearchIds },
		};
	},
});

/**
 * Hard delete a web search result (internal use only - used by publish)
 */
export const hardDeleteById = internalMutation({
	args: {
		webSearchId: v.id("webSearch"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const webSearch = await ctx.db.get(args.webSearchId);
		if (!webSearch) {
			return null;
		}

		await ctx.db.delete(args.webSearchId);

		return null;
	},
});

/**
 * Mark a web search result for deletion (soft delete)
 * The item will be deleted when the user publishes
 */
export const markForDeletion = mutation({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowWebSearch(ctx, {
			webSearchId: args.webSearchId,
			userId: args.userId,
		});

		await ctx.db.patch(args.webSearchId, {
			pendingDelete: true,
		});

		return null;
	},
});

/**
 * Cancel pending deletion of a web search result
 */
export const cancelDeletion = mutation({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowWebSearch(ctx, {
			webSearchId: args.webSearchId,
			userId: args.userId,
		});

		await ctx.db.patch(args.webSearchId, {
			pendingDelete: false,
		});

		return null;
	},
});

/**
 * Create a modified copy of a published web search result
 * The original is kept unchanged, and a new draft is created with replacesId pointing to it
 */
export const createModifiedCopy = mutation({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
		newUrl: v.string(),
	},
	returns: v.id("webSearch"),
	handler: async (ctx, args) => {
		const original = await _getOrThrowWebSearch(ctx, {
			webSearchId: args.webSearchId,
			userId: args.userId,
		});

		// Check if there's already a draft copy for this original
		const existingDraft = await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", original.planId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("replacesId"), args.webSearchId))
			.first();

		if (existingDraft) {
			// Update existing draft instead of creating new one
			await ctx.db.patch(existingDraft._id, {
				url: args.newUrl,
				publishedStatus: {
					type: "draft",
					date: new Date().toISOString(),
				},
			});
			return existingDraft._id;
		}

		// Create a new draft copy
		return await _createWebSearch(ctx, {
			planId: original.planId,
			learningId: original.learningId,
			userId: args.userId,
			query: original.query,
			title: original.title,
			url: args.newUrl,
			image: original.image,
			content: original.content,
			publishedDate: original.publishedDate,
			mappedUrlId: original.mappedUrlId,
			score: original.score,
			other: original.other,
			searchStatus: original.searchStatus,
			publishedStatus: {
				type: "draft",
				date: new Date().toISOString(),
			},
			replacesId: args.webSearchId,
		});
	},
});

/**
 * Cancel a modification by deleting the draft copy
 * The original published item remains unchanged
 */
export const cancelModification = mutation({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const draft = await _getOrThrowWebSearch(ctx, {
			webSearchId: args.webSearchId,
			userId: args.userId,
		});

		// Can only cancel modifications on draft copies (items with replacesId)
		if (!draft.replacesId) {
			throw new Error("This item is not a draft modification");
		}

		await ctx.db.delete(args.webSearchId);

		return null;
	},
});

/**
 * Delete a draft web search result immediately
 * Only works for items that are not yet published
 */
export const deleteDraft = mutation({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const webSearch = await _getOrThrowWebSearch(ctx, {
			webSearchId: args.webSearchId,
			userId: args.userId,
		});

		// Only allow deletion of draft items
		if (webSearch.publishedStatus?.type === "published") {
			throw new Error("Cannot directly delete published items. Use markForDeletion instead.");
		}

		await ctx.db.delete(args.webSearchId);

		return null;
	},
});
