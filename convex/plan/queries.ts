/**
 * Plan queries
 * Single responsibility: Read operations for plan domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { _getOrThrowChatByThreadId } from "../chat/helpers";
import { _getOrThrowPlan, _getOrThrowPlanByChatId } from "./helpers";

/**
 * Get plan details with embedded learningRequirements and search results
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

		// Get search results for this plan (using renamed table)
		const searchResults = await ctx.db
			.query("searchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		return {
			data: {
				...plan,
				detail: {
					learningRequirement: plan.learningRequirements,
					searchResults,
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
 * Get search results by plan ID
 * Now uses the renamed searchResults table
 */
export const getSearchResults = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("searchResults")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get resources (PDF files) by plan ID
 * Now uses the renamed resources table
 */
export const getResources = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.array(
		v.object({
			_id: v.id("resources"),
			_creationTime: v.number(),
			planId: v.optional(v.id("plans")),
			learningId: v.optional(v.id("learnings")),
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
			.query("resources")
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

/**
 * Get search results by learning ID
 * Uses the renamed searchResults table for learning-level resources
 */
export const getSearchResultsByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("searchResults")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get resources by learning ID
 * Uses the renamed resources table for learning-level resources
 */
export const getResourcesByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	returns: v.array(
		v.object({
			_id: v.id("resources"),
			_creationTime: v.number(),
			planId: v.optional(v.id("plans")),
			learningId: v.optional(v.id("learnings")),
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
			.query("resources")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
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
