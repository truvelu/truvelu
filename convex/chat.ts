import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
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
			title: firstTitle,
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
		return await ctx.db
			.query("chats")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.order("desc")
			.paginate(args.paginationOpts);
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
		const { messageId } = await createChatAgentWithModel({
			modelId: modelKey,
		}).saveMessage(ctx, {
			threadId,
			userId,
			prompt,
			skipEmbeddings: true,
		});

		await ctx.scheduler.runAfter(0, internal.chatAction.streamAsync, {
			threadId,
			modelKey,
			promptMessageId: messageId,
		});

		return { threadId, messageId, roomId };
	},
});
