/**
 * Chat mutations
 * Single responsibility: Write operations for chat domain
 */

import { abortStream } from "@convex-dev/agent";
import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { components, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { createAgent } from "../agent";
import {
	SectionTypeValidator,
	agentTypeValidator,
	chatStatusValidator,
} from "../schema";

/**
 * Create a new chat
 */
export const createChat = mutation({
	args: {
		agentType: agentTypeValidator,
		userId: v.string(),
		type: SectionTypeValidator,
		title: v.optional(v.string()),
		summary: v.optional(v.string()),
	},
	handler: async (ctx, { agentType, userId, type, title, summary }) => {
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
			status: "ready",
			uuid: roomId,
		});
		return { id: _chatId, threadId, roomId };
	},
});

/**
 * Patch chat status (internal mutation)
 */
export const patchChatStatus = internalMutation({
	args: {
		threadId: v.string(),
		status: chatStatusValidator,
	},
	handler: async (ctx, { threadId, status }) => {
		const chat = await ctx.db
			.query("chats")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!chat) {
			throw new Error("Chat not found");
		}

		await ctx.db.patch(chat._id, { status });
	},
});

/**
 * Send a chat message
 */
export const sendChatMessage = mutation({
	args: {
		type: v.optional(v.union(v.literal("ask"), v.literal("learning"))),
		userId: v.string(),
		threadId: v.string(),
		roomId: v.string(),
		prompt: v.string(),
	},
	handler: async (ctx, { type = "ask", userId, threadId, roomId, prompt }) => {
		const agentType = type === "ask" ? "question-answering" : "course-planner";

		const agent = createAgent({ agentType });

		await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId,
			status: "submitted",
		});

		const { messageId, message } = await agent.saveMessage(ctx, {
			threadId,
			userId,
			prompt,
			skipEmbeddings: true,
		});

		const orderMessage = message?.order ?? 0;

		await Promise.all([
			ctx.scheduler.runAfter(0, internal.chat.actions.streamAsync, {
				type,
				agentType,
				promptMessageId: messageId,
				threadId,
			}),
			orderMessage > 0
				? Promise.resolve()
				: ctx.scheduler.runAfter(0, internal.chat.actions.updateThreadTitle, {
						threadId,
					}),
		]);

		return { threadId, messageId, roomId };
	},
});

/**
 * Abort stream by order
 */
export const abortStreamByOrder = mutation({
	args: {
		threadId: v.string(),
		order: v.number(),
	},
	handler: async (ctx, { threadId, order }) => {
		const isAborted = await abortStream(ctx, components.agent, {
			threadId,
			order,
			reason: "Aborting explicitly",
		});

		await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId,
			status: "ready",
		});

		return isAborted;
	},
});
