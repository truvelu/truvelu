import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a learning content by ID or throw if not found/unauthorized
 */
export async function _getOrThrowLearningContent(
	ctx: ReadCtx,
	{
		learningContentId,
		userId,
	}: { learningContentId: Id<"learningContents">; userId: string },
) {
	const content = await ctx.db.get(learningContentId);
	if (!content) {
		throw new Error(`Learning content not found: ${learningContentId}`);
	}
	if (content.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this learning content`);
	}
	return content;
}

/**
 * Get a learning by ID or throw if not found/unauthorized
 */
export async function _getOrThrowLearning(
	ctx: ReadCtx,
	{ learningId, userId }: { learningId: Id<"learnings">; userId: string },
) {
	const learning = await ctx.db.get(learningId);
	if (!learning) {
		throw new Error(`Learning not found: ${learningId}`);
	}
	if (learning.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this learning`);
	}
	return learning;
}

