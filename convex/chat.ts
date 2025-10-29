import {
	abortStream,
	getThreadMetadata,
	listUIMessages,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import {
	chatStatusValidator,
	modelOptionsValidator,
	streamSectionValidator,
} from "./schema";

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
			status: "ready",
			...args,
		});
		return { threadId, roomId: args.uuid };
	},
});

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

export const getChats = query({
	args: {
		userId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		// Fetch threads, discussions, and all user chats in parallel
		const [threads, discussions, allChats] = await Promise.all([
			ctx.runQuery(components.agent.threads.listThreadsByUserId, {
				userId: args.userId,
				paginationOpts: args.paginationOpts,
			}),
			ctx.db
				.query("discussions")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
			ctx.db
				.query("chats")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.collect(),
		]);

		const { page, ...paginationInfo } = threads;

		// Create a Set of discussion thread IDs for O(1) lookup
		const discussionThreadIds = new Set(
			discussions.map((discussion) => discussion.threadId),
		);

		// Create a Map of threadId -> chat for O(1) lookup
		const chatsByThreadId = new Map(
			allChats.map((chat) => [chat.threadId, chat]),
		);

		// Filter and enrich threads in a single pass
		const enrichedThreads = page
			.filter((thread) => thread.status === "active")
			.filter((thread) => !discussionThreadIds.has(thread._id))
			.map((thread) => ({
				...thread,
				data: chatsByThreadId.get(thread._id),
			}))
			.filter((thread) => thread.data !== undefined);

		return {
			...paginationInfo,
			page: enrichedThreads,
		};
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
		streamSection: streamSectionValidator,
	},
	handler: async (
		ctx,
		{ userId, threadId, roomId, prompt, modelKey, streamSection },
	) => {
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
				streamSection,
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

export const abortStreamByOrder = mutation({
	args: { threadId: v.string(), order: v.number() },
	handler: async (ctx, { threadId, order }) => {
		return await abortStream(ctx, components.agent, {
			threadId,
			order,
			reason: "Aborting explicitly",
		});
	},
});

export const getMetadata = query({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		return await getThreadMetadata(ctx, components.agent, {
			threadId,
		});
	},
});
