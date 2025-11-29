/**
 * URL to Map queries
 * Single responsibility: Read operations for URL to map domain
 * Renamed from mappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all URL to map entries for a plan
 */
export const getUrlToMapByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("urlToMap")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get all URL to map entries for a learning
 */
export const getUrlToMapByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("urlToMap")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get a single URL to map entry by ID
 */
export const getUrlToMapById = query({
	args: {
		urlToMapId: v.id("urlToMap"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.urlToMapId);
		if (!result || result.userId !== args.userId) {
			return null;
		}
		return result;
	},
});

