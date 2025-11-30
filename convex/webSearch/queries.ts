/**
 * WebSearch queries
 * Single responsibility: Read operations for webSearch domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import {
	freeObjectValidator,
	processStatusValidator,
	publishedStatusValidator,
} from "../schema";

const webSearchReturnValidator = v.object({
	_id: v.id("webSearch"),
	_creationTime: v.number(),
	userId: v.string(),
	planId: v.optional(v.id("plans")),
	learningId: v.optional(v.id("learnings")),
	mappedUrlId: v.optional(v.id("urlToMap")),
	query: v.optional(v.string()),
	title: v.optional(v.string()),
	url: v.optional(v.string()),
	image: v.optional(v.string()),
	content: v.optional(v.string()),
	publishedDate: v.optional(v.string()),
	score: v.optional(v.number()),
	other: freeObjectValidator,
	searchStatus: v.optional(processStatusValidator),
	publishedStatus: v.optional(publishedStatusValidator),
	pendingDelete: v.optional(v.boolean()),
	replacesId: v.optional(v.id("webSearch")),
});

/**
 * Get web search results by plan ID
 */
export const getByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.array(webSearchReturnValidator),
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
	returns: v.array(webSearchReturnValidator),
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
	returns: v.union(webSearchReturnValidator, v.null()),
	handler: async (ctx, args) => {
		const result = await ctx.db.get(args.webSearchId);
		if (!result || result.userId !== args.userId) {
			return null;
		}
		return result;
	},
});

