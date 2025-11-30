/**
 * WebSearch helpers
 * Single responsibility: Helper functions for webSearch domain
 */

import type {
	GenericMutationCtx,
	GenericQueryCtx,
	WithoutSystemFields,
} from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel>;
type WriteCtx = GenericMutationCtx<DataModel>;

export async function _createWebSearch(
	ctx: WriteCtx,
	{
		planId,
		learningId,
		userId,
		query,
		title,
		url,
		image,
		content,
		publishedDate,
		mappedUrlId,
		score,
		other,
		searchStatus,
		publishedStatus,
		pendingDelete,
		replacesId,
	}: WithoutSystemFields<Doc<"webSearch">>,
) {
	return await ctx.db.insert("webSearch", {
		planId,
		learningId,
		userId,
		query,
		title,
		url,
		image,
		content,
		publishedDate,
		mappedUrlId,
		score,
		other,
		searchStatus,
		publishedStatus,
		pendingDelete,
		replacesId,
	});
}

/**
 * Get a web search result by ID or throw if not found/unauthorized
 */
export async function _getOrThrowWebSearch(
	ctx: ReadCtx,
	{ webSearchId, userId }: { webSearchId: Id<"webSearch">; userId: string },
) {
	const webSearch = await ctx.db.get(webSearchId);
	if (!webSearch) {
		throw new Error(`Web search result not found: ${webSearchId}`);
	}
	if (webSearch.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this web search result`);
	}
	return webSearch;
}
