/**
 * Plan mutations
 * Single responsibility: Write operations for plan domain
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { chatStatusValidator, freeObjectValidator } from "../schema";

/**
 * Update plan's embedded learningRequirements
 */
export const updatePlanLearningRequirements = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.object({
			topic: v.optional(v.string()),
			userLevel: v.optional(v.string()),
			goal: v.optional(v.string()),
			duration: v.optional(v.string()),
			other: freeObjectValidator,
		}),
	},
	handler: async (ctx, args) => {
		const plan = await ctx.db.get(args.planId);

		if (!plan || plan.userId !== args.userId) {
			throw new Error("Plan not found");
		}

		await ctx.db.patch(args.planId, {
			learningRequirements: {
				topic: args.data.topic,
				userLevel: args.data.userLevel,
				goal: args.data.goal,
				duration: args.data.duration,
				other: args.data.other,
			},
		});

		return {
			status: 200,
			message: "Learning requirements updated successfully",
		};
	},
});

/**
 * Upsert plan search results (with optional query embedded)
 */
export const upsertPlanSearchResults = mutation({
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
		const plan = await ctx.db.get(args.planId);

		if (!plan || plan.userId !== args.userId) {
			throw new Error("Plan not found");
		}

		const searchResultIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if result with same URL already exists
				if (item.url) {
					const existing = await ctx.db
						.query("planSearchResults")
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
						});
						return existing._id;
					}
				}

				return await ctx.db.insert("planSearchResults", {
					planId: args.planId,
					userId: args.userId,
					query: item.query,
					title: item.title,
					url: item.url,
					image: item.image,
					content: item.content,
					publishedDate: item.publishedDate,
					score: item.score,
					other: item.other,
				});
			}),
		);

		return {
			data: { searchResultIds },
		};
	},
});

/**
 * Update plan status
 */
export const updatePlanStatus = internalMutation({
	args: {
		planId: v.id("plans"),
		status: chatStatusValidator,
	},
	handler: async (ctx, { planId, status }) => {
		await ctx.db.patch(planId, { status });
	},
});
