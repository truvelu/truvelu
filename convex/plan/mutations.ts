/**
 * Plan mutations
 * Single responsibility: Write operations for plan domain
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { chatStatusValidator, freeObjectValidator } from "../schema";
import {
	_getOrThrowPlan,
	_getOrThrowResource,
	_getOrThrowSearchResult,
} from "./helpers";

/**
 * Upsert learning requirements for a plan
 * Now uses separate learningRequirements table
 */
export const upsertLearningRequirements = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.object({
			topic: v.optional(v.string()),
			userLevel: v.optional(v.string()),
			goal: v.optional(v.string()),
			duration: v.optional(v.string()),
			other: freeObjectValidator,
		}),
	},
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Check if learning requirements already exist for this plan
		const existing = await ctx.db
			.query("learningRequirements")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.unique();

		if (existing) {
			// Update existing record
			await ctx.db.patch(existing._id, {
				topic: args.data.topic,
				userLevel: args.data.userLevel,
				goal: args.data.goal,
				duration: args.data.duration,
				other: args.data.other,
			});
			return {
				status: 200,
				message: "Learning requirements updated successfully",
				learningRequirementsId: existing._id,
			};
		}

		// Create new record
		const learningRequirementsId = await ctx.db.insert("learningRequirements", {
			planId: args.planId,
			userId: args.userId,
			learningId: plan.learningId,
			topic: args.data.topic,
			userLevel: args.data.userLevel,
			goal: args.data.goal,
			duration: args.data.duration,
			other: args.data.other,
		});

		return {
			status: 200,
			message: "Learning requirements created successfully",
			learningRequirementsId,
		};
	},
});

/**
 * Upsert search results (with optional query embedded)
 * Now uses the renamed searchResults table and includes learningId
 */
export const upsertSearchResults = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		data: v.array(
			v.object({
				query: v.optional(v.string()),
				title: v.optional(v.string()),
				url: v.optional(v.string()),
				image: v.optional(v.string()),
				content: v.optional(v.string()),
				publishedDate: v.optional(v.string()),
				score: v.optional(v.number()),
				other: freeObjectValidator,
			}),
		),
	},
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		const searchResultIds = await Promise.all(
			args.data.map(async (item) => {
				// Check if result with same URL already exists
				if (item.url) {
					const existing = await ctx.db
						.query("searchResults")
						.withIndex("by_planId_and_userId", (q) =>
							q.eq("planId", args.planId).eq("userId", args.userId),
						)
						.filter((q) => q.eq(q.field("url"), item.url))
						.first();

					if (existing) {
						await ctx.db.patch(existing._id, {
							query: item.query,
							title: item.title,
							url: item.url,
							image: item.image,
							content: item.content,
							publishedDate: item.publishedDate,
							score: item.score,
							other: item.other,
						});
						return existing._id;
					}
				}

				return await ctx.db.insert("searchResults", {
					planId: args.planId,
					learningId: plan.learningId, // Include learningId from plan
					userId: args.userId,
					query: item.query,
					title: item.title,
					url: item.url,
					image: item.image,
					content: item.content,
					publishedDate: item.publishedDate,
					score: item.score,
					other: item.other,
				});
			}),
		);

		return {
			data: { searchResultIds },
		};
	},
});

/**
 * Update plan status
 */
export const updatePlanStatus = internalMutation({
	args: {
		planId: v.id("plans"),
		status: chatStatusValidator,
	},
	handler: async (ctx, { planId, status }) => {
		await ctx.db.patch(planId, { status });
	},
});

/**
 * Generate upload URL for PDF files
 * Only allows PDF files
 */
export const generateUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Save resource (PDF file reference)
 * Called after file is uploaded to storage
 * Now uses the renamed resources table and includes learningId
 */
export const saveResource = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		storageId: v.id("_storage"),
		fileName: v.string(),
		fileSize: v.number(),
		mimeType: v.string(),
	},
	returns: v.id("resources"),
	handler: async (ctx, args) => {
		const plan = await _getOrThrowPlan(ctx, {
			planId: args.planId,
			userId: args.userId,
		});

		// Validate file is PDF
		if (args.mimeType !== "application/pdf") {
			throw new Error("Only PDF files are allowed");
		}

		// Check if this file already exists (by storageId)
		const existing = await ctx.db
			.query("resources")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("storageId"), args.storageId))
			.first();

		if (existing) {
			return existing._id;
		}

		return await ctx.db.insert("resources", {
			planId: args.planId,
			learningId: plan.learningId, // Include learningId from plan
			userId: args.userId,
			storageId: args.storageId,
			fileName: args.fileName,
			fileSize: args.fileSize,
			mimeType: args.mimeType,
		});
	},
});

/**
 * Delete resource
 * Now uses the renamed resources table
 */
export const deleteResource = mutation({
	args: {
		resourceId: v.id("resources"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const resource = await _getOrThrowResource(ctx, {
			resourceId: args.resourceId,
			userId: args.userId,
		});

		// Delete from storage
		await ctx.storage.delete(resource.storageId);

		// Delete the record
		await ctx.db.delete(args.resourceId);

		return null;
	},
});

/**
 * Delete search result (URL)
 * Now uses the renamed searchResults table
 */
export const deleteSearchResult = mutation({
	args: {
		searchResultId: v.id("searchResults"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowSearchResult(ctx, {
			searchResultId: args.searchResultId,
			userId: args.userId,
		});

		await ctx.db.delete(args.searchResultId);

		return null;
	},
});
