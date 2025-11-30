/**
 * Join queries for plan with related tables (planItems)
 * Single responsibility: Combined read operations across plan relationships
 * 
 * Note: For cross-domain operations (webSearch, files, learningRequirements),
 * import from their respective domain folders.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";

/**
 * Get plan with all items by chatId
 */
export const getByChatId = query({
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
			.first();

		if (!plan) {
			return null;
		}

		const items = await ctx.db
			.query("planItems")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", plan._id).eq("userId", args.userId),
			)
			.collect();

		return { plan, items };
	},
});

/**
 * Get the latest plan by chatId (when there might be multiple)
 */
export const getLatestByChatId = query({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const latestPlan = await ctx.db
			.query("plans")
			.withIndex("by_chatId_and_userId", (q) =>
				q.eq("chatId", args.chatId).eq("userId", args.userId),
			)
			.order("desc")
			.first();

		if (!latestPlan) {
			return null;
		}

		const items = await ctx.db
			.query("planItems")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", latestPlan._id).eq("userId", args.userId),
			)
			.collect();

		return { plan: latestPlan, items };
	},
});

/**
 * Internal query for plan with items
 */
export const getByChatIdInternal = internalQuery({
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
			.first();

		if (!plan) {
			return null;
		}

		const items = await ctx.db
			.query("planItems")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", plan._id).eq("userId", args.userId),
			)
			.collect();

		return { plan, items };
	},
});

/**
 * Batch get plans and items for multiple chatIds
 */
export const batchGetByChatIds = internalQuery({
	args: {
		chatIds: v.array(v.id("chats")),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Fetch all plans
		const planPromises = args.chatIds.map((chatId) =>
			ctx.db
				.query("plans")
				.withIndex("by_chatId_and_userId", (q) =>
					q.eq("chatId", chatId).eq("userId", args.userId),
				)
				.first(),
		);

		const planResults = await Promise.all(planPromises);
		const validPlans = planResults.filter(
			(p): p is NonNullable<typeof p> => p !== null,
		);

		// Fetch all items for valid plans
		const itemPromises = validPlans.map((plan) =>
			ctx.db
				.query("planItems")
				.withIndex("by_planId_and_userId", (q) =>
					q.eq("planId", plan._id).eq("userId", args.userId),
				)
				.collect(),
		);

		const itemResults = await Promise.all(itemPromises);

		// Build a map of chatId -> {plan, items}
		const resultMap = new Map<
			Id<"chats">,
			{
				plan: NonNullable<(typeof planResults)[number]>;
				items: (typeof itemResults)[number];
			}
		>();

		validPlans.forEach((plan, index) => {
			resultMap.set(plan.chatId, {
				plan,
				items: itemResults[index],
			});
		});

		return resultMap;
	},
});

/**
 * Delete plan and all its related items
 * Cross-domain deletes (webSearch, learningRequirements) should be handled
 * by calling their respective domain mutations
 */
export const deleteById = internalMutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Fetch and delete all plan items
		const items = await ctx.db
			.query("planItems")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		// Fetch and delete all web search results (cross-domain)
		const webSearch = await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		// Fetch and delete learning requirements (cross-domain)
		const learningRequirements = await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		// Fetch and delete files (cross-domain)
		const files = await ctx.db
			.query("files")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		await Promise.all([
			...items.map((item) => ctx.db.delete(item._id)),
			...webSearch.map((result) => ctx.db.delete(result._id)),
			...learningRequirements.map((lr) => ctx.db.delete(lr._id)),
			...files.map((file) => ctx.db.delete(file._id)),
		]);

		// Delete the plan
		await ctx.db.delete(args.planId);

		return {
			deletedCount: 1,
			itemsDeletedCount: items.length,
			webSearchDeletedCount: webSearch.length,
			learningRequirementsDeletedCount: learningRequirements.length,
			filesDeletedCount: files.length,
		};
	},
});

/**
 * Batch delete plans and items by chatIds
 */
export const batchDeleteByChatIds = internalMutation({
	args: {
		chatIds: v.array(v.id("chats")),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Fetch all plans
		const planPromises = args.chatIds.map((chatId) =>
			ctx.db
				.query("plans")
				.withIndex("by_chatId_and_userId", (q) =>
					q.eq("chatId", chatId).eq("userId", args.userId),
				)
				.collect(),
		);

		const planResults = await Promise.all(planPromises);
		const flatPlans = planResults.flat();

		if (flatPlans.length === 0) {
			return {
				deletedCount: 0,
				itemsDeletedCount: 0,
				webSearchDeletedCount: 0,
				learningRequirementsDeletedCount: 0,
				filesDeletedCount: 0,
			};
		}

		// Fetch all related records for these plans
		const itemPromises = flatPlans.map((plan) =>
			ctx.db
				.query("planItems")
				.withIndex("by_planId_and_userId", (q) =>
					q.eq("planId", plan._id).eq("userId", args.userId),
				)
				.collect(),
		);

		const webSearchPromises = flatPlans.map((plan) =>
			ctx.db
				.query("webSearch")
				.withIndex("by_planId_and_userId", (q) =>
					q.eq("planId", plan._id).eq("userId", args.userId),
				)
				.collect(),
		);

		const learningRequirementsPromises = flatPlans.map((plan) =>
			ctx.db
				.query("learningRequirements")
				.withIndex("by_planId_and_userId", (q) =>
					q.eq("planId", plan._id).eq("userId", args.userId),
				)
				.collect(),
		);

		const filesPromises = flatPlans.map((plan) =>
			ctx.db
				.query("files")
				.withIndex("by_planId_and_userId", (q) =>
					q.eq("planId", plan._id).eq("userId", args.userId),
				)
				.collect(),
		);

		const [itemResults, webSearchResults, learningRequirementsResults, filesResults] =
			await Promise.all([
				Promise.all(itemPromises),
				Promise.all(webSearchPromises),
				Promise.all(learningRequirementsPromises),
				Promise.all(filesPromises),
			]);

		const flatItems = itemResults.flat();
		const flatWebSearch = webSearchResults.flat();
		const flatLearningRequirements = learningRequirementsResults.flat();
		const flatFiles = filesResults.flat();

		// Delete all related records first
		await Promise.all([
			...flatItems.map((item) => ctx.db.delete(item._id)),
			...flatWebSearch.map((result) => ctx.db.delete(result._id)),
			...flatLearningRequirements.map((lr) => ctx.db.delete(lr._id)),
			...flatFiles.map((file) => ctx.db.delete(file._id)),
		]);

		// Delete all plans
		await Promise.all(flatPlans.map((plan) => ctx.db.delete(plan._id)));

		return {
			deletedCount: flatPlans.length,
			itemsDeletedCount: flatItems.length,
			webSearchDeletedCount: flatWebSearch.length,
			learningRequirementsDeletedCount: flatLearningRequirements.length,
			filesDeletedCount: flatFiles.length,
		};
	},
});
