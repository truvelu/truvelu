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
 * This is a reusable action that returns full details including embedded learningRequirements
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
			learningRequirement: Doc<"plans">["learningRequirements"];
			searchResults: Doc<"searchResults">[];
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

		// Get search results (using renamed table)
		const searchResults: Doc<"searchResults">[] = await ctx.runQuery(
			api.plan.queries.getSearchResults,
			{
				planId: lastPlan._id,
				userId: args.userId,
			},
		);

		return {
			plan: lastPlan,
			detail: {
				// learningRequirements is now embedded in the plan
				learningRequirement: lastPlan.learningRequirements,
				searchResults,
			},
		};
	},
});
