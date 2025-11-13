/**
 * Mutations for learningChatMetadata and learningChatMetadataContent
 * Single responsibility: Write operations only
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { learningChatStatusValidator } from "../schema";

/**
 * Update the status of learning chat metadata content
 */
export const updateStatus = mutation({
	args: {
		learningChatId: v.id("learningChats"),
		userId: v.string(),
		status: learningChatStatusValidator,
	},
	handler: async (ctx, args) => {
		const existingMetadata = await ctx.db
			.query("learningChatMetadata")
			.withIndex("by_learningChatId_and_userId", (q) =>
				q.eq("learningChatId", args.learningChatId).eq("userId", args.userId),
			)
			.first();

		if (!existingMetadata) {
			throw new Error("Learning chat metadata not found");
		}

		const existingContent = await ctx.db
			.query("learningChatMetadataContent")
			.withIndex("by_learningChatMetadataId_and_userId", (q) =>
				q
					.eq("learningChatMetadataId", existingMetadata._id)
					.eq("userId", args.userId),
			)
			.first();

		if (!existingContent) {
			throw new Error("Learning chat metadata content not found");
		}

		await ctx.db.patch(existingContent._id, {
			status: args.status,
		});

		return { success: true };
	},
});

/**
 * Delete metadata and content by learningChatId
 */
export const deleteByLearningChatId = internalMutation({
	args: {
		learningChatId: v.id("learningChats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const metadata = await ctx.db
			.query("learningChatMetadata")
			.withIndex("by_learningChatId_and_userId", (q) =>
				q.eq("learningChatId", args.learningChatId).eq("userId", args.userId),
			)
			.first();

		if (!metadata) {
			return { deletedCount: 0 };
		}

		// Delete content first
		const content = await ctx.db
			.query("learningChatMetadataContent")
			.withIndex("by_learningChatMetadataId_and_userId", (q) =>
				q.eq("learningChatMetadataId", metadata._id).eq("userId", args.userId),
			)
			.first();

		if (content) {
			await ctx.db.delete(content._id);
		}

		// Delete metadata
		await ctx.db.delete(metadata._id);

		return { deletedCount: 1 };
	},
});

/**
 * Batch delete metadata and content for multiple learningChatIds
 * More efficient than calling deleteByLearningChatId multiple times
 */
export const batchDelete = internalMutation({
	args: {
		learningChatIds: v.array(v.id("learningChats")),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Fetch all metadata
		const metadataPromises = args.learningChatIds.map((learningChatId) =>
			ctx.db
				.query("learningChatMetadata")
				.withIndex("by_learningChatId_and_userId", (q) =>
					q.eq("learningChatId", learningChatId).eq("userId", args.userId),
				)
				.first(),
		);

		const metadataResults = await Promise.all(metadataPromises);
		const validMetadata = metadataResults.filter(
			(m): m is NonNullable<typeof m> => m !== null,
		);

		if (validMetadata.length === 0) {
			return { deletedCount: 0 };
		}

		// Fetch all content
		const contentPromises = validMetadata.map((metadata) =>
			ctx.db
				.query("learningChatMetadataContent")
				.withIndex("by_learningChatMetadataId_and_userId", (q) =>
					q
						.eq("learningChatMetadataId", metadata._id)
						.eq("userId", args.userId),
				)
				.first(),
		);

		const contentResults = await Promise.all(contentPromises);
		const validContent = contentResults.filter(
			(c): c is NonNullable<typeof c> => c !== null,
		);

		// Delete all content first
		await Promise.all(
			validContent.map((content) => ctx.db.delete(content._id)),
		);

		// Delete all metadata
		await Promise.all(
			validMetadata.map((metadata) => ctx.db.delete(metadata._id)),
		);

		return { deletedCount: validMetadata.length };
	},
});
