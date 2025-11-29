import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a URL to map by ID or throw if not found/unauthorized
 */
export async function _getOrThrowUrlToMap(
	ctx: ReadCtx,
	{
		urlToMapId,
		userId,
	}: { urlToMapId: Id<"urlToMap">; userId: string },
) {
	const result = await ctx.db.get(urlToMapId);
	if (!result) {
		throw new Error(`URL to map not found: ${urlToMapId}`);
	}
	if (result.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this URL to map`);
	}
	return result;
}

