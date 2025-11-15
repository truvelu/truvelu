/**
 * Mutations for learningChatMetadata and learningChatMetadataContent
 * Single responsibility: Write operations only
 */

import { getOneFrom } from "convex-helpers/server/relationships";
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
		const existingMetadata = await getOneFrom(
			ctx.db,
			"learningChatMetadata",
			"by_learningChatId",
			args.learningChatId,
		);

		if (!existingMetadata || existingMetadata.userId !== args.userId) {
			throw new Error("Learning chat metadata not found");
		}

		const existingContent = await getOneFrom(
			ctx.db,
			"learningChatMetadataContent",
			"by_learningChatMetadataId",
			existingMetadata._id,
		);

		if (!existingContent || existingContent.userId !== args.userId) {
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
		const metadata = await getOneFrom(
			ctx.db,
			"learningChatMetadata",
			"by_learningChatId",
			args.learningChatId,
		);

		if (!metadata || metadata.userId !== args.userId) {
			return { deletedCount: 0 };
		}

		// Delete content first
		const content = await getOneFrom(
			ctx.db,
			"learningChatMetadataContent",
			"by_learningChatMetadataId",
			metadata._id,
		);

		if (content && content.userId === args.userId) {
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
		const metadataResults = await Promise.all(
			args.learningChatIds.map((learningChatId) =>
				getOneFrom(
					ctx.db,
					"learningChatMetadata",
					"by_learningChatId",
					learningChatId,
				),
			),
		);
		const validMetadata = metadataResults.filter(
			(m): m is NonNullable<typeof m> =>
				m !== null && m.userId === args.userId,
		);

		if (validMetadata.length === 0) {
			return { deletedCount: 0 };
		}

		// Fetch all content
		const contentResults = await Promise.all(
			validMetadata.map((metadata) =>
				getOneFrom(
					ctx.db,
					"learningChatMetadataContent",
					"by_learningChatMetadataId",
					metadata._id,
				),
			),
		);
		const validContent = contentResults.filter(
			(c): c is NonNullable<typeof c> =>
				c !== null && c.userId === args.userId,
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
