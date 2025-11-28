import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { Infer } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import type { DataModel, Id } from "../_generated/dataModel";
import { createAgent } from "../agent";
import type { SectionType, agentTypeValidator } from "../schema";

type ReadCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get a chat by ID or throw if not found/unauthorized
 */
export async function _getOrThrowChat(
	ctx: ReadCtx,
	{ chatId, userId }: { chatId: Id<"chats">; userId: string },
) {
	const chat = await ctx.db.get(chatId);
	if (!chat) {
		throw new Error(`Chat not found: ${chatId}`);
	}
	if (chat.userId !== userId) {
		throw new Error(`Unauthorized: You don't own this chat`);
	}
	return chat;
}

/**
 * Get a chat by threadId or throw if not found/unauthorized
 */
export async function _getOrThrowChatByThreadId(
	ctx: ReadCtx,
	{ threadId, userId }: { threadId: string; userId: string },
) {
	const chat = await ctx.db
		.query("chats")
		.withIndex("by_threadId_and_userId", (q) =>
			q.eq("threadId", threadId).eq("userId", userId),
		)
		.unique();

	if (!chat) {
		throw new Error(`Chat not found for threadId: ${threadId}`);
	}
	return chat;
}

export async function _createChatService(
	ctx: GenericMutationCtx<DataModel>,
	{
		agentType,
		userId,
		type,
		title,
		summary,
	}: {
		agentType: Infer<typeof agentTypeValidator>;
		userId: string;
		type: SectionType;
		title?: string;
		summary?: string;
	},
) {
	const firstTitle = "New Chat";
	const agent = createAgent({ agentType });
	const { threadId } = await agent.createThread(ctx, {
		userId,
		title: title ?? firstTitle,
		summary: summary ?? "",
	});

	const roomId = uuidv7();
	const _chatId = await ctx.db.insert("chats", {
		userId,
		threadId,
		type,
		status: { type: "ready", message: "Ready to start conversation" },
		uuid: roomId,
	});
	return { id: _chatId, threadId, roomId };
}
