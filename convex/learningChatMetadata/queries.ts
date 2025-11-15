/**
 * Queries for learningChatMetadata and learningChatMetadataContent
 * Single responsibility: Read operations only
 */

import { getOneFrom } from "convex-helpers/server/relationships";
import type { GenericDatabaseReader } from "convex/server";
import { v } from "convex/values";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";

type MetadataBundle = {
	metadata: Doc<"learningChatMetadata">;
	content: Doc<"learningChatMetadataContent"> | null;
};

async function loadMetadataBundle(
	db: GenericDatabaseReader<DataModel>,
	learningChatId: Id<"learningChats">,
	userId: string,
): Promise<MetadataBundle | null> {
	const metadata = await getOneFrom(
		db,
		"learningChatMetadata",
		"by_learningChatId",
		learningChatId,
	);

	if (!metadata || metadata.userId !== userId) {
		return null;
	}

	const content = await getOneFrom(
		db,
		"learningChatMetadataContent",
		"by_learningChatMetadataId",
		metadata._id,
	);

	if (content && content.userId !== userId) {
		return {
			metadata,
			content: null,
		};
	}

	return {
		metadata,
		content,
	};
}

/**
 * Get metadata content by learningChatId
 */
export const getByLearningChatId = query({
	args: {
		learningChatId: v.id("learningChats"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const bundle = await loadMetadataBundle(
			ctx.db,
			args.learningChatId,
			args.userId,
		);

		return bundle;
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
		const bundle = await loadMetadataBundle(
			ctx.db,
			args.learningChatId,
			args.userId,
		);

		return bundle;
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
		const bundles = await Promise.all(
			args.learningChatIds.map((learningChatId) =>
				loadMetadataBundle(ctx.db, learningChatId, args.userId),
			),
		);

		// Build a map of learningChatId -> {metadata, content}
		const resultMap = new Map<
			Id<"learningChats">,
			{
				metadata: Doc<"learningChatMetadata">;
				content: Doc<"learningChatMetadataContent"> | null;
			}
		>();

		for (const bundle of bundles) {
			if (!bundle) continue;
			resultMap.set(bundle.metadata.learningChatId, bundle);
		}

		return resultMap;
	},
});
