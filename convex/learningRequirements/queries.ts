/**
 * LearningRequirements queries
 * Single responsibility: Read operations for learningRequirements domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get learning requirements by plan ID
 */
export const getByPlanId = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * Get learning requirements by learning ID
 */
export const getByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learningRequirements")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

