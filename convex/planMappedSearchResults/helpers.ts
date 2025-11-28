import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a plan mapped search result by ID or throw if not found/unauthorized
 */
export async function _getOrThrowPlanMappedSearchResult(
	ctx: ReadCtx,
	{
		mappedSearchResultId,
		userId,
	}: { mappedSearchResultId: Id<"planMappedSearchResults">; userId: string },
) {
	const result = await ctx.db.get(mappedSearchResultId);
	if (!result) {
		throw new Error(`Plan mapped search result not found: ${mappedSearchResultId}`);
	}
	if (result.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this plan mapped search result`);
	}
	return result;
}

