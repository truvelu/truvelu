/**
 * Learning actions
 * Single responsibility: External actions for learning domain
 */

import { DeltaStreamer, compressUIMessageChunks } from "@convex-dev/agent";
import { generateObject, streamText } from "ai";
import { v } from "convex/values";
import z from "zod";
import { api, components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { createAgent } from "../agent";

const exaApiKey = process.env.EXA_API_KEY;

if (!exaApiKey) {
	throw new Error("EXA_API_KEY environment variable not set");
}

/**
 * Archive a learning chat (marks thread as archived)
 */
export const archiveLearningChat = internalAction({
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

/**
 * Delete a learning chat (deletes thread)
 */
export const deleteLearningChat = internalAction({
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

/**
 * Stream generate learning content for all draft learning chats
 */
export const streamGenerateLearningContent = internalAction({
	args: {
		learningId: v.id("learning"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		const courseContentGeneratorAgent = createAgent({
			agentType: "course-content-generator",
		});

		const learningListData = await ctx.runQuery(
			api.learning.queries.getLearningChatsContentByLearningIdThatStatusDraft,
			{
				userId,
				learningId,
			},
		);

		const streamerCreator = async (data: (typeof learningListData)[number]) => {
			const threadId = data?.chatData?.threadId;

			if (!threadId) return;

			await Promise.all([
				ctx.runMutation(internal.chat.mutations.patchChatStatus, {
					threadId,
					status: "streaming",
				}),
				ctx.runMutation(
					api.learning.mutations.updateLearningChatMetadataPlanStatus,
					{
						learningChatId: data._id,
						userId,
						status: "generating",
					},
				),
			]);

			const generateSearchQueries = await generateObject({
				model: courseContentGeneratorAgent.options.languageModel,
				system: courseContentGeneratorAgent.options.instructions,
				prompt: `<initial-learning-requirement>${JSON.stringify(data?.planMetadataLearningRequirementData)}</initial-learning-requirement>
				<initial-search-query>${JSON.stringify(data?.planMetadataSearchQueryData)}</initial-search-query>
				<initial-search-results>${JSON.stringify(data?.planMetadataSearchResultData)}</initial-search-results>
				<title>${data?.metadata?.title}</title>
				<description>${data?.metadata?.description}</description>
				<learning-objectives>${JSON.stringify(data?.metadata?.learningObjectives)}</learning-objectives>
				<the-ask></the-ask>`,
				schema: z.object({
					searchQueries: z.array(
						z.object({
							query: z.string(),
							numResults: z.number(),
						}),
					),
				}),
			});

			const searchResultsToSave: {
				title: string;
				url: string;
				image: string;
				content: string;
				publishedDate: string;
				score: number;
			}[] = [];

			if (generateSearchQueries.object.searchQueries.length > 0) {
				try {
					// Dynamic import to avoid bundling issues
					const Exa = (await import("exa-js")).default;
					const exa = new Exa(exaApiKey);

					for (const searchQuery of generateSearchQueries.object
						.searchQueries) {
						const { results } = await exa.search(searchQuery.query, {
							useAutoprompt: true,
							numResults: searchQuery.numResults,
						});
						const processedResults = results.map((result) => ({
							title: result.title ?? "",
							url: result.url ?? "",
							image: result.image ?? "",
							content: result.text ?? "",
							publishedDate: result.publishedDate ?? "",
							score: result.score ?? 0,
						}));
						searchResultsToSave.push(...processedResults);
					}
				} catch (error) {
					console.error("Exa search error:", error);
					throw new Error(
						`Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
			}

			const streamer = new DeltaStreamer(
				components.agent,
				ctx,
				{
					throttleMs: 100,
					onAsyncAbort: async () => console.error("Aborted asynchronously"),
					// This will collapse multiple tiny deltas into one if they're being sent
					// in quick succession.
					compress: compressUIMessageChunks,
					abortSignal: undefined,
				},
				{
					threadId,
					format: "UIMessageChunk",
					order: 0,
					stepOrder: 0,
					userId: userId,
				},
			);

			const response = streamText({
				model: courseContentGeneratorAgent.options.languageModel,
				system: courseContentGeneratorAgent.options.instructions,
				prompt: `
				<search-results>${JSON.stringify(searchResultsToSave)}</search-results>
				<learning-requirement>${JSON.stringify(data?.planMetadataLearningRequirementData)}</learning-requirement>
				<title>${data?.metadata?.title}</title>
				<description>${data?.metadata?.description}</description>
				<learning-objectives>${JSON.stringify(data?.metadata?.learningObjectives)}</learning-objectives>
				<the-ask>
				1. Generate a learning list for the user's learning plan based on parameters that mentioned in the prompt.
				2. make sure the learning content is follow the learning objectives and the learning requirement.
				3. output the learning list in markdown format.
				</the-ask>`,
				onFinish: async (completion) => {
					const text = completion.text;
					await courseContentGeneratorAgent.saveMessage(ctx, {
						threadId,
						message: {
							role: "assistant",
							content: text,
						},
						userId,
						skipEmbeddings: true,
					});
					await Promise.all([
						ctx.runMutation(internal.chat.mutations.patchChatStatus, {
							threadId,
							status: "ready",
						}),
						ctx.runMutation(
							api.learning.mutations.updateLearningChatMetadataPlanStatus,
							{
								learningChatId: data._id,
								userId,
								status: "completed",
							},
						),
					]);
				},
				onError: (error) => {
					console.error(error);
					streamer.fail(JSON.stringify(error));
				},
				abortSignal: streamer.abortController.signal,
			});

			await streamer.consumeStream(response.toUIMessageStream());
		};

		const BATCH_SIZE = 4;
		for (let i = 0; i < learningListData.length; i += BATCH_SIZE) {
			const batch = learningListData.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map(async (data) => {
					await streamerCreator(data);
				}),
			);
		}
	},
});

/**
 * Generate greeting message for learner
 */
export const generateGreetingMessageForLearnerAsync = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		const titleGenerationAgent = createAgent({ agentType: "title-generation" });
		const contentGenerationAgent = createAgent({
			agentType: "course-content-generator",
		});

		await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId,
			status: "streaming",
		});

		const streamer = new DeltaStreamer(
			components.agent,
			ctx,
			{
				throttleMs: 100,
				onAsyncAbort: async () => console.error("Aborted asynchronously"),
				// This will collapse multiple tiny deltas into one if they're being sent
				// in quick succession.
				compress: compressUIMessageChunks,
				abortSignal: undefined,
			},
			{
				threadId,
				format: "UIMessageChunk",
				order: 0,
				stepOrder: 0,
				userId,
			},
		);

		const response = streamText({
			model: titleGenerationAgent.options.languageModel,
			system: contentGenerationAgent.options.instructions,
			prompt: `Greet the learner in a friendly and engaging way. After that ask the user about:
			1. topic they want to learn about,
			2. user level understanding of the topic,
			3. user's goal for learning the topic
			4. the user's prefered duration for learning the topic (short: Crash Course, detailed: Course)`,
			onFinish: async (completion) => {
				const text = completion.text;
				await contentGenerationAgent.saveMessage(ctx, {
					threadId,
					message: {
						role: "assistant",
						content: text,
					},
					userId,
					skipEmbeddings: true,
				});
				await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
					threadId,
					status: "ready",
				});
			},
			onError: async (error) => {
				console.error(error);
				streamer.fail(JSON.stringify(error));
				await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
					threadId,
					status: "error",
				});
			},
			abortSignal: streamer.abortController.signal,
		});

		await streamer.consumeStream(response.toUIMessageStream());
	},
});
