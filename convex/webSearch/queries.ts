/**
 * WebSearch queries
 * Single responsibility: Read operations for webSearch domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get web search results by plan ID
 */
export const getByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get web search results by learning ID
 */
export const getByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("webSearch")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get a single web search result by ID
 */
export const getById = query({
	args: {
		webSearchId: v.id("webSearch"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.webSearchId);
		if (!result || result.userId !== args.userId) {
			return null;
		}
		return result;
	},
});

