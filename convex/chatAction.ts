import { generateText } from "ai";
import { v } from "convex/values";
import z from "zod";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { createAgent } from "./agent";
import { agentTypeValidator } from "./schema";

export const streamAsync = internalAction({
	args: {
		promptMessageId: v.string(),
		threadId: v.string(),
		agentType: agentTypeValidator,
	},
	handler: async (ctx, { promptMessageId, threadId, agentType }) => {
		const agent = createAgent({ agentType });

		const [result] = await Promise.all([
			agent.streamText(
				ctx,
				{ threadId },
				{ promptMessageId },
				{
					saveStreamDeltas: {
						chunking: "word",
						throttleMs: 100,
					},
				},
			),

			ctx.runMutation(internal.chat.patchChatStatus, {
				threadId,
				status: "streaming",
			}),
		]);

		await result.consumeStream();
		await ctx.runMutation(internal.chat.patchChatStatus, {
			threadId,
			status: "ready",
		});
	},
});

export const generateGreetingMessageForLearnerAsync = internalAction({
	args: {
		threadId: v.string(),
		agentType: agentTypeValidator,
		userId: v.string(),
	},
	handler: async (ctx, { threadId, agentType, userId }) => {
		const agent = createAgent({ agentType });

		await ctx.runMutation(internal.chat.patchChatStatus, {
			threadId,
			status: "streaming",
		});

		const { text } = await generateText({
			model: agent.options.languageModel,
			system: agent.options.instructions,
			prompt: "Generate a greeting message for the learner.",
		});

		await agent.saveMessage(ctx, {
			threadId,
			message: {
				role: "assistant",
				content: text,
			},
			userId,
			skipEmbeddings: true,
		});

		await ctx.runMutation(internal.chat.patchChatStatus, {
			threadId,
			status: "ready",
		});
	},
});

export const updateThreadTitle = internalAction({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }) => {
		const agent = createAgent({
			agentType: "title-generation",
			storageOptions: { saveMessages: "none" },
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		const {
			object: { title, summary },
		} = await agent.generateObject(
			ctx,
			{ threadId },
			{
				mode: "json",
				schemaDescription:
					"Generate a title and summary for the thread. The title should be a single sentence that captures the main topic of the thread. The summary should be a short description of the thread that could be used to describe it to someone who hasn't read it.",
				schema: z.object({
					title: z.string().describe("The new title for the thread"),
					summary: z.string().describe("The new summary for the thread"),
				}),
				prompt: "Generate a title and summary for this thread.",
			},
		);

		await thread.updateMetadata({ title, summary });
	},
});

export const updateChatTitle = action({
	args: {
		threadId: v.string(),
		title: v.string(),
	},
	handler: async (ctx, { threadId, title }) => {
		const agent = createAgent({
			agentType: "title-generation",
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		await thread.updateMetadata({ title });
	},
});

export const archiveChat = action({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		await thread.updateMetadata({ status: "archived" });
	},
});

export const deleteChat = action({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		await agent.deleteThreadSync(ctx, { threadId });
	},
});
