/**
 * Plan actions
 * Single responsibility: External actions for plan domain
 */

import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

/**
 * Get the last plan with all details by threadId
 * This is a reusable action that returns full details including learningRequirements from separate table
 */
export const getLastPlanWithDetailsByThreadId = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		plan: Doc<"plans">;
		detail: {
			learningRequirement: Doc<"learningRequirements"> | null;
			webSearch: Doc<"webSearch">[];
		};
	}> => {
		// Get the last plan
		const lastPlan: Doc<"plans"> = await ctx.runQuery(
			api.plan.queries.getLastPlanByThreadId,
			{
				threadId: args.threadId,
				userId: args.userId,
			},
		);

		// Get learning requirements from separate table
		const learningRequirements: Doc<"learningRequirements"> | null =
			await ctx.runQuery(api.plan.queries.getLearningRequirements, {
				planId: lastPlan._id,
				userId: args.userId,
			});

		// Get web search results
		const webSearch: Doc<"webSearch">[] = await ctx.runQuery(
			api.plan.queries.getWebSearch,
			{
				planId: lastPlan._id,
				userId: args.userId,
			},
		);

		return {
			plan: lastPlan,
			detail: {
				learningRequirement: learningRequirements,
				webSearch,
			},
		};
	},
});
