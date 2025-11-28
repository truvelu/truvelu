/**
 * Chat mutations
 * Single responsibility: Write operations for chat domain
 */

import { abortStream, vMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { createAgent } from "../agent";
import {
	agentTypeValidator,
	chatModeValidator,
	chatStatusValidator,
	chatTypeValidator,
	learningPreferenceValidator,
} from "../schema";
import { _createChatService, _getOrThrowChat } from "./helpers";

/**
 * Create a new chat
 * Now stores learningId and planId directly in the chat record
 */
export const createChat = mutation({
	args: {
		agentType: agentTypeValidator,
		userId: v.string(),
		type: chatTypeValidator,
		title: v.optional(v.string()),
		summary: v.optional(v.string()),
		learningId: v.optional(v.id("learnings")),
		planId: v.optional(v.id("plans")),
	},
	handler: async (ctx, { agentType, userId, type, title, summary, learningId, planId }) => {
		return await _createChatService(ctx, {
			agentType,
			userId,
			type,
			title,
			summary,
			learningId,
			planId,
		});
	},
});

/**
 * Create a new discussion (chat linked to parent chat and message)
 * Inherits learningId and planId from the parent chat
 */
export const createDiscussion = mutation({
	args: {
		parentChatId: v.id("chats"),
		linkedMessageId: v.string(),
		agentType: agentTypeValidator,
		userId: v.string(),
		messages: v.array(vMessage),
	},
	handler: async (
		ctx,
		{ parentChatId, linkedMessageId, messages, agentType, userId },
	) => {
		const firstTitle = "New Discussion";
		const agent = createAgent({ agentType });

		// Get parent chat to inherit learningId and planId
		const parentChat = await ctx.db.get(parentChatId);

		// Create a chat record for this discussion
		const { id: discussionChatId, threadId } = await _createChatService(ctx, {
			agentType,
			userId,
			type: "discussion",
			title: firstTitle,
			parentChatId,
			linkedMessageId,
			learningId: parentChat?.learningId,
			planId: parentChat?.planId,
		});

		await Promise.all([
			ctx.scheduler.runAfter(0, internal.chat.actions.updateThreadTitle, {
				threadId,
			}),
			agent.saveMessages(ctx, {
				threadId,
				messages,
				userId,
				skipEmbeddings: true,
			}),
		]);

		return { threadId };
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
			.withIndex("by_threadId_and_userId", (q) => q.eq("threadId", threadId))
			.first();

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
		type: v.optional(chatModeValidator),
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
			status: { type: "submitted", message: "Sending message..." },
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
 * Send learning preference and update learningRequirements (separate table)
 * Also saves user-provided URLs to searchResults (deduplicates automatically)
 */
export const sendLearningPreference = mutation({
	args: {
		threadId: v.string(),
		userId: v.string(),
		payload: learningPreferenceValidator,
	},
	handler: async (ctx, { threadId, userId, payload }) => {
		const lastPlan = await ctx.runQuery(
			api.plan.queries.getLastPlanByThreadId,
			{
				threadId,
				userId,
			},
		);

		if (!lastPlan) {
			throw new Error("Last plan not found");
		}

		// Upsert learning requirements in separate table
		await ctx.runMutation(api.plan.mutations.upsertLearningRequirements, {
			planId: lastPlan._id,
			userId,
			data: {
				topic: payload.topic ?? undefined,
				userLevel: payload.userLevel ?? undefined,
				goal: payload.goal ?? undefined,
				duration: payload.duration ?? undefined,
				other: payload.other,
			},
		});

		// Extract and save user-provided URLs to searchResults (renamed table)
		// This handles deduplication - if URL already exists, it won't be duplicated
		if (
			payload.other &&
			typeof payload.other === "object" &&
			"urls" in payload.other &&
			Array.isArray(payload.other.urls)
		) {
			const urlsToSave = payload.other.urls
				.filter(
					(urlItem: unknown): urlItem is { url: string; search?: string } =>
						typeof urlItem === "object" &&
						urlItem !== null &&
						"url" in urlItem &&
						typeof (urlItem as { url: unknown }).url === "string" &&
						(urlItem as { url: string }).url.trim() !== "",
				)
				.map((urlItem: { url: string; search?: string }) => ({
					url: urlItem.url,
					query: urlItem.search ?? undefined,
					title: undefined,
					image: undefined,
					content: undefined,
					publishedDate: undefined,
					score: undefined,
					other: undefined,
				}));

			if (urlsToSave.length > 0) {
				await ctx.runMutation(api.plan.mutations.upsertSearchResults, {
					planId: lastPlan._id,
					userId,
					data: urlsToSave,
				});
			}
		}

		// Save uploaded file resources (PDFs) using renamed table
		if (
			payload.other &&
			typeof payload.other === "object" &&
			"fileResources" in payload.other &&
			Array.isArray(payload.other.fileResources)
		) {
			for (const fileResource of payload.other.fileResources) {
				if (
					typeof fileResource === "object" &&
					fileResource !== null &&
					"storageId" in fileResource &&
					"fileName" in fileResource &&
					"fileSize" in fileResource &&
					"mimeType" in fileResource
				) {
					await ctx.runMutation(api.plan.mutations.saveResource, {
						planId: lastPlan._id,
						userId,
						storageId: fileResource.storageId,
						fileName: fileResource.fileName,
						fileSize: fileResource.fileSize,
						mimeType: fileResource.mimeType,
					});
				}
			}
		}

		await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId,
			status: {
				type: "submitted",
				message: "Sending learning preference...",
			},
		});

		await ctx.scheduler.runAfter(
			0,
			internal.chat.actions.streamUserLearningPreference,
			{
				threadId,
				userId,
				payload,
			},
		);
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
			status: { type: "aborted", message: "Aborted stream" },
		});

		return isAborted;
	},
});

export const deleteChat = internalMutation({
	args: {
		chatId: v.id("chats"),
		userId: v.string(),
	},
	handler: async (ctx, { chatId, userId }) => {
		await _getOrThrowChat(ctx, { chatId, userId });

		// Get child chats (discussions) that reference this chat as parent
		const childChats = await ctx.db
			.query("chats")
			.withIndex("by_parentChatId_and_userId", (q) =>
				q.eq("parentChatId", chatId).eq("userId", userId),
			)
			.collect();

		// Delete all child chats
		await Promise.all(childChats.map((chat) => ctx.db.delete(chat._id)));

		await ctx.db.delete(chatId);
	},
});

/**
 * Delete a discussion by thread ID
 */
export const deleteDiscussion = internalMutation({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		// Find the discussion's chat by threadId
		const discussionChat = await ctx.db
			.query("chats")
			.withIndex("by_threadId_and_userId", (q) =>
				q.eq("threadId", threadId).eq("userId", userId),
			)
			.unique();

		if (!discussionChat) {
			throw new Error("Discussion chat not found");
		}

		await ctx.db.delete(discussionChat._id);
	},
});
