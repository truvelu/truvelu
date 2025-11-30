/**
 * Files queries
 * Single responsibility: Read operations for files domain
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { publishedStatusValidator } from "../schema";

/**
 * Get files by plan ID
 */
export const getByPlanId = query({
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
			publishedStatus: v.optional(publishedStatusValidator),
			pendingDelete: v.optional(v.boolean()),
			replacesId: v.optional(v.id("files")),
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
 * Get files by learning ID
 */
export const getByLearningId = query({
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
			publishedStatus: v.optional(publishedStatusValidator),
			pendingDelete: v.optional(v.boolean()),
			replacesId: v.optional(v.id("files")),
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

/**
 * Get a single file by ID
 */
export const getById = query({
	args: {
		fileId: v.id("files"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.fileId);
		if (!file || file.userId !== args.userId) {
			return null;
		}
		return {
			...file,
			url: await ctx.storage.getUrl(file.storageId),
		};
	},
});

