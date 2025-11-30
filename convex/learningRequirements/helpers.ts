/**
 * LearningRequirements helpers
 * Single responsibility: Helper functions for learningRequirements domain
 */

import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a learning requirement by ID or throw if not found/unauthorized
 */
export async function _getOrThrowLearningRequirement(
	ctx: ReadCtx,
	{
		learningRequirementId,
		userId,
	}: { learningRequirementId: Id<"learningRequirements">; userId: string },
) {
	const requirement = await ctx.db.get(learningRequirementId);
	if (!requirement) {
		throw new Error(`Learning requirement not found: ${learningRequirementId}`);
	}
	if (requirement.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this learning requirement`);
	}
	return requirement;
}

