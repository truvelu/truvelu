import type { GenericMutationCtx } from "convex/server";
import type { Infer } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import type { DataModel } from "../_generated/dataModel";
import { createAgent } from "../agent";
import type { SectionType, agentTypeValidator } from "../schema";

export async function createChatService(
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
