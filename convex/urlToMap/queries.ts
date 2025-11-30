/**
 * URL to Map queries
 * Single responsibility: Read operations for URL to map domain
 * Renamed from mappedSearchResults - now supports both plan and learning level
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { processStatusValidator, publishedStatusValidator } from "../schema";

const urlToMapReturnValidator = v.object({
	_id: v.id("urlToMap"),
	_creationTime: v.number(),
	userId: v.string(),
	planId: v.optional(v.id("plans")),
	learningId: v.optional(v.id("learnings")),
	url: v.optional(v.string()),
	search: v.optional(v.string()),
	limit: v.optional(v.number()),
	ignoreSitemap: v.optional(v.boolean()),
	includeSubdomains: v.optional(v.boolean()),
	mapStatus: v.optional(processStatusValidator),
	publishedStatus: v.optional(publishedStatusValidator),
	pendingDelete: v.optional(v.boolean()),
	replacesId: v.optional(v.id("urlToMap")),
});

/**
 * Get all URL to map entries for a plan
 */
export const getUrlToMapByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.array(urlToMapReturnValidator),
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
	returns: v.array(urlToMapReturnValidator),
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
	returns: v.union(urlToMapReturnValidator, v.null()),
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.urlToMapId);
		if (!result || result.userId !== args.userId) {
			return null;
		}
		return result;
	},
});

