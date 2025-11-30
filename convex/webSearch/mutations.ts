/**
 * WebSearch mutations
 * Single responsibility: Write operations for webSearch domain
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
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
				});
			}),
		);

		return {
			data: { webSearchIds },
		};
	},
});

/**
 * Delete a web search result
 */
export const deleteById = mutation({
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

		await ctx.db.delete(args.webSearchId);

		return null;
	},
});
