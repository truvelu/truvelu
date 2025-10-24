import { v } from "convex/values";
import z from "zod";
import { action, internalAction } from "./_generated/server";
import { createChatAgentWithModel } from "./agent";
import { modelOptionsValidator } from "./schema";

export const streamAsync = internalAction({
	args: {
		promptMessageId: v.string(),
		threadId: v.string(),
		modelKey: modelOptionsValidator,
	},
	handler: async (ctx, { promptMessageId, threadId, modelKey }) => {
		const result = await createChatAgentWithModel({
			modelId: modelKey,
		}).streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{
				saveStreamDeltas: {
					chunking: "word",
					throttleMs: 100,
					returnImmediately: true,
				},
			},
		);

		await result.consumeStream();
	},
});

export const updateThreadTitle = internalAction({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }) => {
		const agent = createChatAgentWithModel({
			modelId: "google/gemma-3n-e4b-it",
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		const {
			object: { title, summary },
		} = await thread.generateObject(
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
			{ storageOptions: { saveMessages: "none" } },
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
		const agent = createChatAgentWithModel({
			modelId: "google/gemma-3n-e4b-it",
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		await thread.updateMetadata({ title });
	},
});
