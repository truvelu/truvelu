/**
 * Files mutations
 * Single responsibility: Write operations for files domain
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
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
			publishedStatus: {
				type: "draft",
				date: new Date().toISOString(),
			},
		});
	},
});

/**
 * Hard delete a file (internal use only - used by publish)
 */
export const hardDeleteById = internalMutation({
	args: {
		fileId: v.id("files"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.fileId);
		if (!file) {
			return null;
		}

		// Delete from storage
		await ctx.storage.delete(file.storageId);

		// Delete the record
		await ctx.db.delete(args.fileId);

		return null;
	},
});

/**
 * Mark a file for deletion (soft delete)
 * The file will be deleted when the user publishes
 */
export const markForDeletion = mutation({
	args: {
		fileId: v.id("files"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowFile(ctx, {
			fileId: args.fileId,
			userId: args.userId,
		});

		await ctx.db.patch(args.fileId, {
			pendingDelete: true,
		});

		return null;
	},
});

/**
 * Cancel pending deletion of a file
 */
export const cancelDeletion = mutation({
	args: {
		fileId: v.id("files"),
		userId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await _getOrThrowFile(ctx, {
			fileId: args.fileId,
			userId: args.userId,
		});

		await ctx.db.patch(args.fileId, {
			pendingDelete: false,
		});

		return null;
	},
});

/**
 * Delete a draft file immediately
 * Only works for files that are not yet published
 */
export const deleteDraft = mutation({
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

		// Only allow deletion of draft files
		if (file.publishedStatus?.type === "published") {
			throw new Error("Cannot directly delete published files. Use markForDeletion instead.");
		}

		// Delete from storage
		await ctx.storage.delete(file.storageId);

		// Delete the record
		await ctx.db.delete(args.fileId);

		return null;
	},
});
