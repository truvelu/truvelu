/**
 * Chat mutations
 * Single responsibility: Write operations for chat domain
 */

import { abortStream } from "@convex-dev/agent";
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
 */
export const createChat = mutation({
	args: {
		agentType: agentTypeValidator,
		userId: v.string(),
		type: chatTypeValidator,
		title: v.optional(v.string()),
		summary: v.optional(v.string()),
	},
	handler: async (ctx, { agentType, userId, type, title, summary }) => {
		return await _createChatService(ctx, {
			agentType,
			userId,
			type,
			title,
			summary,
		});
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
 * Send learning preference and update plan's embedded learningRequirements
 * Also saves user-provided URLs to planSearchResults (deduplicates automatically)
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

		// Update the plan's embedded learningRequirements
		await ctx.db.patch(lastPlan._id, {
			learningRequirements: {
				topic: payload.topic ?? undefined,
				userLevel: payload.userLevel ?? undefined,
				goal: payload.goal ?? undefined,
				duration: payload.duration ?? undefined,
				other: payload.other,
			},
		});

		// Extract and save user-provided URLs to planSearchResults
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
				await ctx.runMutation(api.plan.mutations.upsertPlanSearchResults, {
					planId: lastPlan._id,
					userId,
					data: urlsToSave,
				});
			}
		}

		// Save uploaded file resources (PDFs)
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
					await ctx.runMutation(api.plan.mutations.savePlanResource, {
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
		const discussionChat = await ctx.runQuery(
			api.discussion.queries.getDiscussionByParentChatId,
			{
				chatId,
				userId,
			},
		);
		await Promise.all([
			...discussionChat.map((discussion) => ctx.db.delete(discussion._id)),
		]);
		await Promise.all([
			...discussionChat.map((discussion) => ctx.db.delete(discussion.chatId)),
		]);
		await ctx.db.delete(chatId);
	},
});
