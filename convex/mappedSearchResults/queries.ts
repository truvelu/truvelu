/**
 * Mapped Search Results queries
 * Single responsibility: Read operations for mapped search results domain
 * Renamed from planMappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all mapped search results for a plan
 */
export const getMappedSearchResultsByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("mappedSearchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get all mapped search results for a learning
 */
export const getMappedSearchResultsByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("mappedSearchResults")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get a single mapped search result by ID
 */
export const getMappedSearchResultById = query({
	args: {
		mappedSearchResultId: v.id("mappedSearchResults"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.mappedSearchResultId);
		if (!result || result.userId !== args.userId) {
			return null;
		}
		return result;
	},
});

