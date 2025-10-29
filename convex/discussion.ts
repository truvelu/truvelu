import { vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import { chatStatusValidator, modelOptionsValidator } from "./schema";

export const createDiscussion = mutation({
	args: {
		parentChatId: v.id("chats"),
		messageId: v.string(),
		uuid: v.string(),
		modelKey: modelOptionsValidator,
		userId: v.string(),
		messages: v.array(vMessage),
	},
	handler: async (
		ctx,
		{ parentChatId, messageId, messages, uuid, modelKey, userId },
	) => {
		const firstTitle = "New Discussion";
		const agent = createChatAgentWithModel({ modelId: modelKey });
		const { threadId } = await agent.createThread(ctx, {
			userId,
			title: firstTitle,
		});

		// Create a chat record for this discussion
		const discussionChatId = await ctx.db.insert("chats", {
			uuid,
			threadId,
			userId,
			status: "ready",
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
				chatId: discussionChatId,
				parentChatId,
				messageId,
				userId,
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
		// Find the discussion's chat record by threadId
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!discussionChat) {
			throw new Error("Discussion chat not found");
		}

		// Update the chat's status (not the discussion record)
		await ctx.db.patch(discussionChat._id, { status });
	},
});

export const getDiscussionByTreadIdAndUserId = query({
	args: {
		userId: v.string(),
		threadId: v.string(),
	},
	handler: async (ctx, { userId, threadId }) => {
		// Now we query chats for discussions (since discussions are also chats)
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", threadId).eq("userId", userId),
			)
			.unique();

		if (!discussionChat) return null;

		// Get the discussion metadata
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_chatId", (q) => q.eq("chatId", discussionChat._id))
			.unique();

		if (!discussion) return null;

		return {
			...discussionChat,
			discussionMeta: discussion,
		};
	},
});

export const getDiscussionByUUIDAndUserId = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, { userId, uuid }) => {
		// Now we query chats for discussions (since discussions are also chats)
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", uuid).eq("userId", userId),
			)
			.unique();

		if (!discussionChat) return null;

		// Get the discussion metadata
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_chatId", (q) => q.eq("chatId", discussionChat._id))
			.unique();

		if (!discussion) return null;

		return {
			...discussionChat,
			discussionMeta: discussion,
		};
	},
});

export const getDiscussionWithParentChat = query({
	args: {
		discussionId: v.id("discussions"),
	},
	handler: async (ctx, { discussionId }) => {
		const discussion = await ctx.db.get(discussionId);
		if (!discussion) return null;

		// Get the discussion's own chat record
		const discussionChat = await ctx.db.get(discussion.chatId);

		// Get the parent chat
		const parentChat = await ctx.db.get(discussion.parentChatId);

		return {
			discussion,
			discussionChat,
			parentChat,
		};
	},
});

export const getDiscussionByMessageIdAndUserId = query({
	args: {
		messageId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { messageId, userId }) => {
		// First find the discussion by messageId
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageId))
			.unique();

		if (!discussion) return null;

		// Get the discussion's chat and verify ownership
		const discussionChat = await ctx.db.get(discussion.chatId);

		if (!discussionChat || discussionChat.userId !== userId) {
			return null;
		}

		return {
			...discussionChat,
			discussionMeta: discussion,
		};
	},
});

export const deleteDiscussion = mutation({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		// Find the discussion's chat by threadId
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();

		if (!discussionChat) {
			throw new Error("Discussion chat not found");
		}

		// Find the discussion record
		const discussion = await ctx.db
			.query("discussions")
			.withIndex("by_chatId", (q) => q.eq("chatId", discussionChat._id))
			.unique();

		if (!discussion) {
			throw new Error("Discussion record not found");
		}

		await Promise.all([
			// Delete the thread
			ctx.scheduler.runAfter(0, api.chatAction.deleteChat, {
				threadId,
			}),
			// Delete the discussion record
			ctx.db.delete(discussion._id),
			// Delete the discussion's chat record
			ctx.db.delete(discussionChat._id),
		]);
	},
});
