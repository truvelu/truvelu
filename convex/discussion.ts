import { vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import { chatStatusValidator, modelOptionsValidator } from "./schema";

export const createDiscussion = mutation({
	args: {
		chatId: v.id("chats"),
		messageId: v.string(),
		uuid: v.string(),
		modelKey: modelOptionsValidator,
		userId: v.string(),
		messages: v.array(vMessage),
	},
	handler: async (
		ctx,
		{ chatId, messageId, messages, uuid, modelKey, userId },
	) => {
		const firstTitle = "New Discussion";
		const agent = createChatAgentWithModel({ modelId: modelKey });
		const { threadId } = await agent.createThread(ctx, {
			userId,
			title: firstTitle,
		});

		await Promise.all([
			ctx.scheduler.runAfter(0, internal.chatAction.updateThreadTitle, {
				threadId,
			}),
			agent.saveMessages(ctx, {
				threadId,
				messages,
				userId,
				skipEmbeddings: true,
			}),
			ctx.db.insert("discussions", {
				chatId,
				messageId,
				uuid,
				threadId,
				userId,
				status: "ready",
			}),
		]);

		return { threadId };
	},
});

export const patchDiscussionStatus = internalMutation({
	args: {
		threadId: v.string(),
		status: chatStatusValidator,
	},
	handler: async (ctx, { threadId, status }) => {
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!discussion) {
			throw new Error("Discussion not found");
		}

		await ctx.db.patch(discussion._id, { status });
	},
});

export const getDiscussionByUUIDAndUserId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, { userId, uuid }) => {
		return await ctx.db
			.query("discussions")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", uuid).eq("userId", userId),
			)
			.unique();
	},
});

export const getDiscussionByMessageIdAndUserId = query({
	args: {
		messageId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { messageId, userId }) => {
		return await ctx.db
			.query("discussions")
			.withIndex("by_messageId_and_userId", (q) =>
				q.eq("messageId", messageId).eq("userId", userId),
			)
			.unique();
	},
});

export const deleteDiscussion = mutation({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!discussion) {
			throw new Error("Discussion not found");
		}

		await Promise.all([
			ctx.scheduler.runAfter(0, api.chatAction.deleteChat, {
				threadId: discussion?.threadId ?? "",
			}),
			ctx.db.delete(discussion?._id),
		]);
	},
});
