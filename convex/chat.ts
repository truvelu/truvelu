import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import { modelOptionsValidator } from "./schema";

export const createChat = mutation({
	args: {
		uuid: v.string(),
		modelKey: modelOptionsValidator,
		userId: v.string(),
	},
	handler: async (ctx, { modelKey, userId, ...args }) => {
		const firstTitle = "New Chat";
		const agent = createChatAgentWithModel({ modelId: modelKey });
		const { threadId } = await agent.createThread(ctx, {
			userId,
			title: firstTitle,
		});
		await ctx.db.insert("chats", {
			userId,
			threadId,
			...args,
		});
		return { threadId, roomId: args.uuid };
	},
});

export const getChats = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const allThreads = await ctx.runQuery(
			components.agent.threads.listThreadsByUserId,
			{
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			},
		);
		const allThreadsWithChatsPage = await Promise.all(
			allThreads.page.map(async (thread) => {
				const chat = await ctx.db
					.query("chats")
					.withIndex("by_threadId_and_userId", (q) =>
						q.eq("threadId", thread._id).eq("userId", args.userId),
					)
					.unique();

				return {
					...thread,
					additionalData: chat,
				};
			}),
		);
		return { ...allThreads, page: allThreadsWithChatsPage };
	},
});

export const getChat = query({
	args: {
		userId: v.string(),
		uuid: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("chats")
			.withIndex("by_uuid_and_userId", (q) =>
				q.eq("uuid", args.uuid).eq("userId", args.userId),
			)
			.unique();
	},
});

export const listThreadMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		const { threadId, streamArgs } = args;
		const streams = await syncStreams(ctx, components.agent, {
			threadId,
			streamArgs,
			includeStatuses: ["streaming", "aborted", "finished"],
		});

		const paginated = await listUIMessages(ctx, components.agent, args);

		return { ...paginated, streams };
	},
});

export const sendChatMessage = mutation({
	args: {
		userId: v.string(),
		threadId: v.string(),
		roomId: v.string(),
		prompt: v.string(),
		modelKey: modelOptionsValidator,
	},
	handler: async (ctx, { userId, threadId, roomId, prompt, modelKey }) => {
		const { messageId, message } = await createChatAgentWithModel({
			modelId: modelKey,
		}).saveMessage(ctx, {
			threadId,
			userId,
			prompt,
			skipEmbeddings: true,
		});

		const orderMessage = message?.order ?? 0;

		await Promise.all([
			ctx.scheduler.runAfter(0, internal.chatAction.streamAsync, {
				threadId,
				modelKey,
				promptMessageId: messageId,
			}),
			orderMessage > 0
				? Promise.resolve()
				: ctx.scheduler.runAfter(0, internal.chatAction.updateThreadTitle, {
						threadId,
					}),
		]);

		return { threadId, messageId, roomId };
	},
});
