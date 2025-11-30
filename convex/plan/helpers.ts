/**
 * Plan helpers
 * Single responsibility: Helper functions for plan domain only
 */

import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

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
 * Get a plan item by ID or throw if not found/unauthorized
 */
export async function _getOrThrowPlanItem(
	ctx: ReadCtx,
	{ planItemId, userId }: { planItemId: Id<"planItems">; userId: string },
) {
	const planItem = await ctx.db.get(planItemId);
	if (!planItem) {
		throw new Error(`Plan item not found: ${planItemId}`);
	}
	if (planItem.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this plan item`);
	}
	return planItem;
}
