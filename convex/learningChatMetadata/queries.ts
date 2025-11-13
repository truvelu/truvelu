/**
 * Queries for learningChatMetadata and learningChatMetadataContent
 * Single responsibility: Read operations only
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";

/**
 * Get metadata content by learningChatId
 */
export const getByLearningChatId = query({
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
			return null;
		}

		const content = await ctx.db
			.query("learningChatMetadataContent")
			.withIndex("by_learningChatMetadataId_and_userId", (q) =>
				q.eq("learningChatMetadataId", metadata._id).eq("userId", args.userId),
			)
			.first();

		return { metadata, content };
	},
});

/**
 * Internal query to get metadata and content (for use in other mutations/actions)
 */
export const getByLearningChatIdInternal = internalQuery({
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
			return null;
		}

		const content = await ctx.db
			.query("learningChatMetadataContent")
			.withIndex("by_learningChatMetadataId_and_userId", (q) =>
				q.eq("learningChatMetadataId", metadata._id).eq("userId", args.userId),
			)
			.first();

		return { metadata, content };
	},
});

/**
 * Batch get metadata and content for multiple learningChatIds
 * More efficient than calling getByLearningChatId multiple times
 */
export const getBatchByLearningChatIds = internalQuery({
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

		// Filter out null results and fetch content
		const validMetadata = metadataResults.filter(
			(m): m is NonNullable<typeof m> => m !== null,
		);

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

		// Build a map of learningChatId -> {metadata, content}
		const resultMap = new Map<
			Id<"learningChats">,
			{
				metadata: NonNullable<(typeof metadataResults)[number]>;
				content: (typeof contentResults)[number];
			}
		>();

		validMetadata.forEach((metadata, index) => {
			resultMap.set(metadata.learningChatId, {
				metadata,
				content: contentResults[index],
			});
		});

		return resultMap;
	},
});
