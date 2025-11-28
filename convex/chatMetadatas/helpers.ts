import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a chat metadata by ID or throw if not found/unauthorized
 */
export async function _getOrThrowChatMetadata(
	ctx: ReadCtx,
	{
		chatMetadataId,
		userId,
	}: { chatMetadataId: Id<"chatMetadatas">; userId: string },
) {
	const metadata = await ctx.db.get(chatMetadataId);
	if (!metadata) {
		throw new Error(`Chat metadata not found: ${chatMetadataId}`);
	}
	if (metadata.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this chat metadata`);
	}
	return metadata;
}

/**
 * Get a chat metadata by chat ID or throw if not found
 */
export async function _getOrThrowChatMetadataByChatId(
	ctx: ReadCtx,
	{ chatId, userId }: { chatId: Id<"chats">; userId: string },
) {
	const metadata = await ctx.db
		.query("chatMetadatas")
		.withIndex("by_chatId_and_userId", (q) =>
			q.eq("chatId", chatId).eq("userId", userId),
		)
		.unique();

	if (!metadata) {
		throw new Error(`Chat metadata not found for chatId: ${chatId}`);
	}
	return metadata;
}

