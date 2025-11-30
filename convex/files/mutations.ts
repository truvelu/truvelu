/**
 * Files mutations
 * Single responsibility: Write operations for files domain
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { _getOrThrowPlan } from "../plan/helpers";
import { _getOrThrowFile } from "./helpers";

/**
 * Generate upload URL for file storage
 */
export const generateUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Save file reference for a plan
 * Called after file is uploaded to storage
 */
export const saveForPlan = mutation({
	args: {
		planId: v.id("plans"),
		userId: v.string(),
		storageId: v.id("_storage"),
		fileName: v.string(),
		fileSize: v.number(),
		mimeType: v.string(),
	},
	returns: v.id("files"),
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
			.query("files")
			.withIndex("by_planId_and_userId", (q) =>
				q.eq("planId", args.planId).eq("userId", args.userId),
			)
			.filter((q) => q.eq(q.field("storageId"), args.storageId))
			.first();

		if (existing) {
			return existing._id;
		}

		return await ctx.db.insert("files", {
			planId: args.planId,
			learningId: plan.learningId,
			userId: args.userId,
			storageId: args.storageId,
			fileName: args.fileName,
			fileSize: args.fileSize,
			mimeType: args.mimeType,
		});
	},
});

/**
 * Delete a file
 */
export const deleteById = mutation({
	args: {
		fileId: v.id("files"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const file = await _getOrThrowFile(ctx, {
			fileId: args.fileId,
			userId: args.userId,
		});

		// Delete from storage
		await ctx.storage.delete(file.storageId);

		// Delete the record
		await ctx.db.delete(args.fileId);

		return null;
	},
});

