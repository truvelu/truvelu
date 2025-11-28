/**
 * Plan Mapped Search Results queries
 * Single responsibility: Read operations for plan mapped search results domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all mapped search results for a plan
 */
export const getPlanMappedSearchResults = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("planMappedSearchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get a single mapped search result by ID
 */
export const getPlanMappedSearchResultById = query({
	args: {
		mappedSearchResultId: v.id("planMappedSearchResults"),
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
