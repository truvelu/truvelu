import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a mapped search result by ID or throw if not found/unauthorized
 */
export async function _getOrThrowMappedSearchResult(
	ctx: ReadCtx,
	{
		mappedSearchResultId,
		userId,
	}: { mappedSearchResultId: Id<"mappedSearchResults">; userId: string },
) {
	const result = await ctx.db.get(mappedSearchResultId);
	if (!result) {
		throw new Error(`Mapped search result not found: ${mappedSearchResultId}`);
	}
	if (result.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this mapped search result`);
	}
	return result;
}

