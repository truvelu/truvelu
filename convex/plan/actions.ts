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
 * This is a reusable action that returns full details
 * Uses cross-domain queries from webSearch and learningRequirements
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

		// Get learning requirements from learningRequirements domain
		const learningRequirements: Doc<"learningRequirements"> | null =
			await ctx.runQuery(api.learningRequirements.queries.getByPlanId, {
				planId: lastPlan._id,
				userId: args.userId,
			});

		// Get web search results from webSearch domain
		const webSearch: Doc<"webSearch">[] = await ctx.runQuery(
			api.webSearch.queries.getByPlanId,
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
