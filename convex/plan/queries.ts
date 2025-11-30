/**
 * Plan queries
 * Single responsibility: Read operations for plan domain only
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { _getOrThrowChatByThreadId } from "../chat/helpers";
import { _getOrThrowPlan, _getOrThrowPlanByChatId } from "./helpers";

/**
 * Get plan details with learningRequirements and search results
 * Uses cross-domain queries from other domain folders
 */
export const getPlanDetail = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Get learning requirements from learningRequirements domain
		const learningRequirements = await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		// Get web search results from webSearch domain
		const webSearch = await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		return {
			data: {
				...plan,
				detail: {
					learningRequirement: learningRequirements,
					webSearch,
				},
			},
		};
	},
});

/**
 * Get the last plan by threadId
 * This is a reusable query to avoid duplication across tools
 */
export const getLastPlanByThreadId = query({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const chat = await _getOrThrowChatByThreadId(ctx, {
			threadId: args.threadId,
			userId: args.userId,
		});

		return await _getOrThrowPlanByChatId(ctx, {
			chatId: chat._id,
			userId: args.userId,
		});
	},
});

/**
 * Get plan by chatId and userId
 */
export const getPlanByChatIdAndUserId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await _getOrThrowPlanByChatId(ctx, {
			chatId: args.chatId,
			userId: args.userId,
		});
	},
});

/**
 * Get plan items by plan ID
 */
export const getPlanItems = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("planItems")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});
