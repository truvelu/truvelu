import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a plan resource by ID or throw if not found/unauthorized
 */
export async function _getOrThrowPlanResource(
	ctx: ReadCtx,
	{ resourceId, userId }: { resourceId: Id<"planResources">; userId: string },
) {
	const resource = await ctx.db.get(resourceId);
	if (!resource) {
		throw new Error(`Plan resource not found: ${resourceId}`);
	}
	if (resource.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this plan resource`);
	}
	return resource;
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
 * Get a plan search result by ID or throw if not found/unauthorized
 */
export async function _getOrThrowPlanSearchResult(
	ctx: ReadCtx,
	{
		searchResultId,
		userId,
	}: { searchResultId: Id<"planSearchResults">; userId: string },
) {
	const searchResult = await ctx.db.get(searchResultId);
	if (!searchResult) {
		throw new Error(`Plan search result not found: ${searchResultId}`);
	}
	if (searchResult.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this plan search result`);
	}
	return searchResult;
}