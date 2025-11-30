/**
 * Files helpers
 * Single responsibility: Helper functions for files domain
 */

import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a file by ID or throw if not found/unauthorized
 */
export async function _getOrThrowFile(
	ctx: ReadCtx,
	{ fileId, userId }: { fileId: Id<"files">; userId: string },
) {
	const file = await ctx.db.get(fileId);
	if (!file) {
		throw new Error(`File not found: ${fileId}`);
	}
	if (file.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this file`);
	}
	return file;
}

