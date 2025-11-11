import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";

/**
 * Get the last plan with metadata details by threadId
 * This is a reusable action that ensures metadata exists and returns full details
 * Use this in AI tools to avoid duplication
 */
export const getLastPlanWithMetadataByThreadId = action({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		plan: Doc<"plans">;
		metadata: Doc<"planMetadata"> & {
			detail: {
				learningRequirement?: Doc<"planMetadataLearningRequirements"> | null;
				planMetadataSearchQueries?: Doc<"planMetadataSearchQueries">[];
				planMetadataSearchResults?: Doc<"planMetadataSearchResults">[];
			};
		};
	}> => {
		// Get the last plan
		const lastPlan: Doc<"plans"> = await ctx.runQuery(
			api.plan.getLastPlanByThreadId,
			{
				threadId: args.threadId,
				userId: args.userId,
			},
		);

		// Ensure planMetadata exists
		await ctx.runMutation(api.plan.createOrGetPlanMetadata, {
			planId: lastPlan._id,
			userId: args.userId,
		});

		// Get full metadata details
		const planMetadataDetail = await ctx.runQuery(
			api.plan.getPlanMetadataDetail,
			{
				planId: lastPlan._id,
				userId: args.userId,
			},
		);

		if (!planMetadataDetail.data) {
			throw new Error("Plan metadata detail not found");
		}

		return {
			plan: lastPlan,
			metadata: planMetadataDetail.data,
		};
	},
});
