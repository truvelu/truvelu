import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a file by ID or throw if not found/unauthorized
 * Renamed from _getOrThrowResource
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

/**
 * Get a plan by ID or throw if not found/unauthorized
 */
export async function _getOrThrowPlan(
	ctx: ReadCtx,
	{ planId, userId }: { planId: Id<"plans">; userId: string },
) {
	const plan = await ctx.db.get(planId);
	if (!plan) {
		throw new Error(`Plan not found: ${planId}`);
	}
	if (plan.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this plan`);
	}
	return plan;
}

/**
 * Get a plan by chatId or throw if not found/unauthorized
 */
export async function _getOrThrowPlanByChatId(
	ctx: ReadCtx,
	{ chatId, userId }: { chatId: Id<"chats">; userId: string },
) {
	const plan = await ctx.db
		.query("plans")
		.withIndex("by_chatId_and_userId", (q) =>
			q.eq("chatId", chatId).eq("userId", userId),
		)
		.order("desc")
		.first();

	if (!plan) {
		throw new Error(`Plan not found for chatId: ${chatId}`);
	}
	return plan;
}

/**
 * Get a web search result by ID or throw if not found/unauthorized
 * Renamed from _getOrThrowSearchResult
 */
export async function _getOrThrowWebSearch(
	ctx: ReadCtx,
	{
		webSearchId,
		userId,
	}: { webSearchId: Id<"webSearch">; userId: string },
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
