/**
 * Plan queries
 * Single responsibility: Read operations for plan domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get plan details with embedded learningRequirements and search results
 */
export const getPlanDetail = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const plan = await ctx.db.get(args.planId);

		if (!plan || plan.userId !== args.userId) {
			throw new Error(
				`Plan not found, planId: ${args.planId}, userId: ${args.userId}`,
			);
		}

		// Get search results for this plan
		const planSearchResults = await ctx.db
			.query("planSearchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		return {
			data: {
				...plan,
				detail: {
					learningRequirement: plan.learningRequirements,
					planSearchResults,
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

		const lastPlan = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", chat._id).eq("userId", args.userId),
			)
			.order("desc")
			.first();

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
		const plan = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", args.chatId).eq("userId", args.userId),
			)
			.order("desc")
			.first();

		if (!plan) {
			throw new Error("No plan found for this chat");
		}

		return plan;
	},
});

/**
 * Get plan search results by plan ID
 */
export const getPlanSearchResults = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("planSearchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get plan resources (PDF files) by plan ID
 */
export const getPlanResources = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.array(
		v.object({
			_id: v.id("planResources"),
			_creationTime: v.number(),
			planId: v.id("plans"),
			userId: v.string(),
			storageId: v.id("_storage"),
			fileName: v.string(),
			fileSize: v.number(),
			mimeType: v.string(),
			url: v.union(v.string(), v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const resources = await ctx.db
			.query("planResources")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		return await Promise.all(
			resources.map(async (resource) => ({
				...resource,
				url: await ctx.storage.getUrl(resource.storageId),
			})),
		);
	},
});
