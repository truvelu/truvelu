/**
 * Plan queries
 * Single responsibility: Read operations for plan domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { _getOrThrowChatByThreadId } from "../chat/helpers";
import { _getOrThrowPlan, _getOrThrowPlanByChatId } from "./helpers";

/**
 * Get plan details with learningRequirements and search results
 * Now queries learningRequirements from separate table
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

		// Get learning requirements from separate table
		const learningRequirements = await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		// Get web search results for this plan
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
 * Get learning requirements by plan ID
 * New query for the separate learningRequirements table
 */
export const getLearningRequirements = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();
	},
});

/**
 * Get web search results by plan ID
 * Now uses the renamed webSearch table
 */
export const getWebSearch = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("webSearch")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get files (PDF files) by plan ID
 * Now uses the renamed files table
 */
export const getFiles = query({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
	},
	returns: v.array(
		v.object({
			_id: v.id("files"),
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
		const files = await ctx.db
			.query("files")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.collect();

		return await Promise.all(
			files.map(async (file) => ({
				...file,
				url: await ctx.storage.getUrl(file.storageId),
			})),
		);
	},
});

/**
 * Get web search results by learning ID
 * Uses the renamed webSearch table for learning-level resources
 */
export const getWebSearchByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("webSearch")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();
	},
});

/**
 * Get files by learning ID
 * Uses the renamed files table for learning-level resources
 */
export const getFilesByLearningId = query({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	returns: v.array(
		v.object({
			_id: v.id("files"),
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
		const files = await ctx.db
			.query("files")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", args.learningId).eq("userId", args.userId),
			)
			.collect();

		return await Promise.all(
			files.map(async (file) => ({
				...file,
				url: await ctx.storage.getUrl(file.storageId),
			})),
		);
	},
});
