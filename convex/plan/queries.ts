/**
 * Plan queries
 * Single responsibility: Read operations for plan domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get plan metadata details with all related data
 */
export const getPlanMetadataDetail = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const planMetadata = await ctx.db
			.query("planMetadata")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		if (!planMetadata) {
			throw new Error(
				`Plan metadata not found, planId: ${args.planId}, userId: ${args.userId}, data: ${JSON.stringify(planMetadata)}`,
			);
		}

		const [
			learningRequirement,
			planMetadataSearchQueries,
			planMetadataSearchResults,
		] = await Promise.all([
			ctx.db
				.query("planMetadataLearningRequirements")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.unique(),
			ctx.db
				.query("planMetadataSearchQueries")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.collect(),
			ctx.db
				.query("planMetadataSearchResults")
				.withIndex("by_planMetadataId_and_userId", (q) =>
					q.eq("planMetadataId", planMetadata._id).eq("userId", args.userId),
				)
				.collect(),
		]);

		return {
			data: {
				...planMetadata,
				detail: {
					learningRequirement,
					planMetadataSearchQueries,
					planMetadataSearchResults,
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
		// Get chat by threadId
		const chat = await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", args.threadId).eq("userId", args.userId),
			)
			.unique();

		if (!chat) {
			throw new Error("Chat not found");
		}

		// Get all plans for this chat
		const plans = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", chat._id).eq("userId", args.userId),
			)
			.collect();

		const lastPlan = plans[plans.length - 1];

		if (!lastPlan) {
			throw new Error("No plan found for this chat");
		}

		return lastPlan;
	},
});

export const getPlanByChatIdAndUserId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const plans = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", args.chatId).eq("userId", args.userId),
			)
			.collect();

		if (plans.length === 0) {
			throw new Error("No plan found for this chat");
		}

		return plans[plans.length - 1];
	},
});
