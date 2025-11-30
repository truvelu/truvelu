/**
 * Resources queries
 * Single responsibility: Read operations across files, webSearch, and urlToMap
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";

/**
 * Get pending changes count for a plan
 * Returns the number of items that would be affected by publishing
 */
export const getPendingChangesCount = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.object({
		totalPending: v.number(),
		drafts: v.number(),
		pendingDeletes: v.number(),
		modifications: v.number(),
	}),
	handler: async (ctx, args) => {
		await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		let drafts = 0;
		let pendingDeletes = 0;
		let modifications = 0;

		// Count files
		const files = await ctx.db
			.query("files")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		for (const file of files) {
			if (file.pendingDelete) pendingDeletes++;
			else if (file.publishedStatus?.type === "draft") {
				if (file.replacesId) modifications++;
				else drafts++;
			}
		}

		// Count web searches
		const webSearches = await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		for (const ws of webSearches) {
			if (ws.pendingDelete) pendingDeletes++;
			else if (ws.publishedStatus?.type === "draft") {
				if (ws.replacesId) modifications++;
				else drafts++;
			}
		}

		// Count URL to maps
		const urlToMaps = await ctx.db
			.query("urlToMap")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		for (const utm of urlToMaps) {
			if (utm.pendingDelete) pendingDeletes++;
			else if (utm.publishedStatus?.type === "draft") {
				if (utm.replacesId) modifications++;
				else drafts++;
			}
		}

		return {
			totalPending: drafts + pendingDeletes + modifications,
			drafts,
			pendingDeletes,
			modifications,
		};
	},
});

