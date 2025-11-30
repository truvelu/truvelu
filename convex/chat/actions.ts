/**
 * Chat actions
 * Single responsibility: External actions for chat domain
 */

import { DeltaStreamer, compressUIMessageChunks } from "@convex-dev/agent";
import { generateObject, generateText, streamText } from "ai";
import { v } from "convex/values";
import z from "zod";
import { api, components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { _createToolResult } from "../_helpers";
import { createAgent } from "../agent";
import {
	agentTypeValidator,
	chatModeValidator,
	learningPreferenceValidator,
} from "../schema";

/**
 * Update thread title automatically
 */
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

/**
 * Update chat title manually
 */
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

/**
 * Archive a chat
 */
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

/**
 * Delete a chat
 */
export const deleteChat = action({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		const chat = await ctx.runQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			{
				threadId,
				userId,
			},
		);
		if (!chat) {
			throw new Error("Chat not found");
		}

		await ctx.runMutation(internal.chat.mutations.deleteChat, {
			chatId: chat._id,
			userId,
		});
		await agent.deleteThreadSync(ctx, { threadId });
	},
});

/**
 * Delete a discussion (chat linked to a parent chat)
 */
export const deleteDiscussion = action({
	args: {
		threadId: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, { threadId, userId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});

		await ctx.runMutation(internal.chat.mutations.deleteDiscussion, {
			threadId,
			userId,
		});
		await agent.deleteThreadSync(ctx, { threadId });
	},
});

/**
 * Tool: Generate search queries for learning plan
 */
export const generateSearchQueriesTool = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
	},
	returns: v.string(),
	handler: async (ctx, { threadId, userId, agentType }): Promise<string> => {
		const agent = createAgent({ agentType });

		// Get plan with details using the action (learningRequirements from separate table)
		const planData: {
			plan: Doc<"plans">;
			detail: {
				learningRequirement: Doc<"learningRequirements"> | null;
				webSearch: Doc<"webSearch">[];
			};
		} = await ctx.runAction(
			internal.plan.actions.getLastPlanWithDetailsByThreadId,
			{ threadId, userId },
		);
		const learningRequirement = planData.detail.learningRequirement;

		const searchQueriesObject = await generateObject({
			model: agent.options.languageModel,
			system: agent.options.instructions,
			prompt: `
				<metadata>${JSON.stringify(learningRequirement)}</metadata>
				<the-ask>Generate a search query for the user's learning plan based on the metadata.</the-ask>`,
			schema: z.object({
				queriesOptions: z
					.array(
						z.object({
							query: z
								.string()
								.describe(
									"The search query, we can add prefix or suffix something like 'documentaion', 'book', 'course', 'guide', 'research paper', 'pdf', etc",
								),
							other: z.object({
								numResults: z
									.number()
									.describe(
										"The number of results to return, it depends on the complex of query",
									),
							}),
						}),
					)
					.describe("Search queries"),
			}),
		});

		// We'll save the actual search results when we run the web search
		const result = JSON.stringify({
			data: {
				searchQueries: searchQueriesObject?.object,
			},
			message:
				"Search queries generated successfully. Next continue to call the web search tool to find relevant, high-quality educational resources about the search query.",
		});

		await agent.saveMessages(ctx, {
			threadId,
			messages: _createToolResult("generateSearchQueries", result),
			skipEmbeddings: true,
		});

		return result;
	},
});

/**
 * Tool: Web search using Exa API
 */
export const webSearchTool = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
	},
	returns: v.string(),
	handler: async (ctx, { threadId, userId, agentType }): Promise<string> => {
		const agent = createAgent({ agentType });

		const exaApiKey = process.env.EXA_API_KEY;

		if (!exaApiKey) {
			throw new Error("EXA_API_KEY environment variable not set");
		}

		// Get plan with details (learningRequirements from separate table)
		const planData: {
			plan: Doc<"plans">;
			detail: {
				learningRequirement: Doc<"learningRequirements"> | null;
				webSearch: Doc<"webSearch">[];
			};
		} = await ctx.runAction(
			internal.plan.actions.getLastPlanWithDetailsByThreadId,
			{ threadId, userId },
		);
		const plan = planData.plan;
		const learningRequirement = planData.detail.learningRequirement;

		// Generate search queries based on learning requirements
		const searchQueriesObject = await generateObject({
			model: agent.options.languageModel,
			system: agent.options.instructions,
			prompt: `
				<metadata>${JSON.stringify(learningRequirement)}</metadata>
				<the-ask>Generate search queries for the user's learning plan.</the-ask>`,
			schema: z.object({
				queriesOptions: z.array(
					z.object({
						query: z.string(),
						numResults: z.number().max(3).default(3),
					}),
				),
			}),
		});

		try {
			// Dynamic import to avoid bundling issues
			const Exa = (await import("exa-js")).default;
			const exa = new Exa(exaApiKey);

			const webSearchToSave: Array<{
				query?: string;
				title?: string;
				url?: string;
				image?: string;
				content?: string;
				publishedDate?: string;
				score?: number;
			}> = [];

			for (const searchQuery of searchQueriesObject.object.queriesOptions) {
				const { results } = await exa.search(searchQuery.query, {
					useAutoprompt: true,
					numResults: searchQuery.numResults ?? 3,
				});

				const processedResults = results.map((result) => ({
					query: searchQuery.query ?? "",
					title: result.title ?? "",
					url: result.url ?? "",
					image: result.image ?? "",
					content: result.text ?? "",
					publishedDate: result.publishedDate ?? "",
					score: result.score ?? 0,
				}));

				webSearchToSave.push(...processedResults);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Save web search results to database (now includes learningId automatically)
			await ctx.runMutation(api.webSearch.mutations.upsertForPlan, {
				planId: plan._id,
				userId,
				data: webSearchToSave,
			});

			const result = JSON.stringify({
				data: webSearchToSave.map((r) => ({
					title: r.title,
					url: r.url,
					image: r.image,
				})),
				message: "Web search is done. Continue to generate learning list.",
			});

			await agent.saveMessages(ctx, {
				threadId,
				messages: _createToolResult("webSearch", result),
				skipEmbeddings: true,
			});

			return result;
		} catch (error) {
			console.error("Exa search error:", error);
			throw new Error(
				`Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	},
});

/**
 * Tool: Generate learning list
 */
export const generateLearningListTool = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
	},
	returns: v.string(),
	handler: async (ctx, { threadId, userId, agentType }): Promise<string> => {
		const agent = createAgent({ agentType });

		// Get plan with details (learningRequirements from separate table)
		const planData: {
			plan: Doc<"plans">;
			detail: {
				learningRequirement: Doc<"learningRequirements"> | null;
				webSearch: Doc<"webSearch">[];
			};
		} = await ctx.runAction(
			internal.plan.actions.getLastPlanWithDetailsByThreadId,
			{ threadId, userId },
		);

		const learningRequirement = planData.detail.learningRequirement;
		const webSearch = planData.detail.webSearch;

		const learningRequirementContent = `
			<topic>${learningRequirement?.topic}<topic>
			<user_level>${learningRequirement?.userLevel}<user_level>
			<goal>${learningRequirement?.goal}<goal>
			<duration>${learningRequirement?.duration}<duration>
			<other>${JSON.stringify(learningRequirement?.other)}<other>`;

		const webSearchContent = webSearch?.map(
			(result: Doc<"webSearch">, idx: number) =>
				`<search_result_${idx}>
			<title>${result.title}</title>
			<url>${result.url}</url>
			<content>${result.content}</content>
			</search_result_${idx}>`,
		);

		const [learningTitleGeneratext, learningListGenerateObject] =
			await Promise.all([
				generateText({
					model: createAgent({
						agentType: "title-generation",
					}).options.languageModel,
					system: createAgent({
						agentType: "title-generation",
					}).options.instructions,
					prompt: `
						<metadata>
						<learning_requirement>${learningRequirementContent}</learning_requirement>
						</metadata>
						<the-ask>Generate a title for the user's learning plan based on metadata. The title cannot be more than 50 characters.</the-ask>`,
				}),
				generateObject({
					model: agent.options.languageModel,
					system: agent.options.instructions,
					prompt: `
						<metadata>
						<learning_requirement>${learningRequirementContent}</learning_requirement>
						<search_results>${webSearchContent?.join("\n\n")}</search_results>
						</metadata>

						<the-ask>Generate a learning list for the user's learning plan based on the search results.</the-ask>
						<output>After this tool is called, just ask the user to see the learning list inside the learning dashboard, because the data will be shown there.</output>`,
					schema: z.object({
						learningList: z
							.array(
								z.object({
									order: z.number().describe("The order of the course"),
									title: z.string().describe("The title of the course"),
									description: z
										.string()
										.describe("The description of the course"),
									learningObjectives: z
										.array(z.string())
										.describe("The learning objectives of the course"),
									priority: z
										.enum(["must_know", "should_know", "nice_to_know"])
										.describe("The priority of the course"),
								}),
							)
							.max(8),
					}),
				}),
			]);

		const chat = await ctx.runQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			{ threadId, userId },
		);

		if (!chat) {
			throw new Error("Chat not found");
		}

		// Get learning content by chat ID (using the new query)
		const lastPlan = await ctx.runQuery(
			api.plan.queries.getPlanByChatIdAndUserId,
			{ chatId: chat._id, userId },
		);

		if (!lastPlan) {
			throw new Error("Plan not found");
		}

		await Promise.all([
			ctx.runMutation(api.learning.mutations.updateLearningTitle, {
				learningId: lastPlan.learningId,
				title: learningTitleGeneratext.text,
			}),
			ctx.runMutation(api.learning.mutations.createLearningContent, {
				learningId: lastPlan.learningId,
				userId,
				data: learningListGenerateObject.object.learningList.map(
					(item, index) => ({
						order: index + 1,
						title: item.title,
						description: item.description,
						learningObjectives: item.learningObjectives,
					}),
				),
			}),
		]);

		const result = JSON.stringify({
			data: {
				learningList: learningListGenerateObject.object.learningList,
			},
			message:
				"Learning list generated successfully. Next continue to ask the user to see the learning list inside the learning dashboard, because the data will be shown there.",
		});

		await agent.saveMessages(ctx, {
			threadId,
			messages: _createToolResult("generateLearningList", result),
			skipEmbeddings: true,
		});

		return result;
	},
});

/**
 * Tool: Stream generate learning content
 */
export const streamGenerateLearningContentTool = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
	},
	returns: v.string(),
	handler: async (ctx, { threadId, userId, agentType }) => {
		const agent = createAgent({ agentType });

		const chat = await ctx.runQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			{ threadId, userId },
		);

		if (!chat) {
			throw new Error("Chat not found");
		}

		// Get learning content by chat ID
		const lastPlan = await ctx.runQuery(
			api.plan.queries.getPlanByChatIdAndUserId,
			{
				chatId: chat._id,
				userId,
			},
		);

		if (!lastPlan) {
			throw new Error("Plan not found");
		}

		await ctx.scheduler.runAfter(
			0,
			internal.learning.actions.streamGenerateLearningContent,
			{
				learningId: lastPlan.learningId,
				userId,
			},
		);

		const result = JSON.stringify({
			message:
				"Learning content streamed successfully. Next continue to ask the user to see the learning content inside the learning dashboard, because the data will be shown there.",
		});

		await agent.saveMessages(ctx, {
			threadId,
			messages: _createToolResult("streamGenerateLearningContent", result),
			skipEmbeddings: true,
		});

		return result;
	},
});

/**
 * Stream chat messages async (handles both "ask" and "agent" types)
 * This is a polymorphic action that coordinates between chat and learning domains
 */
export const streamAsync = internalAction({
	args: {
		type: v.optional(chatModeValidator),
		promptMessageId: v.string(),
		threadId: v.string(),
		agentType: agentTypeValidator,
	},
	handler: async (
		ctx,
		{ type = "ask", promptMessageId, threadId, agentType },
	) => {
		const agent = createAgent({
			agentType,
		});

		// Update status to streaming
		await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId,
			status: { type: "streaming", message: "Generating content..." },
		});

		// Type "ask": Just use regular LLM without tools
		if (type === "ask") {
			const askResult = await agent.streamText(
				ctx,
				{ threadId },
				{ promptMessageId },
				{
					saveStreamDeltas: {
						chunking: "word",
						throttleMs: 100,
					},
				},
			);

			await askResult?.consumeStream();
			await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
				threadId,
				status: { type: "ready", message: "Ready" },
			});
			return;
		}

		// Type "agent": Check if learning content exists
		if (type === "agent") {
			// If content exists: Just use LLM with understandUserAnswer tool for refinement
			const learningResult = await agent.streamText(
				ctx,
				{ threadId },
				{
					promptMessageId,
					system: `${agent.options.instructions}
					<context>
					The user already has a learning plan. You can help them refine their learning preferences if needed.
					</context>`,
				},
				{
					saveStreamDeltas: {
						chunking: "word",
						throttleMs: 100,
					},
				},
			);

			await learningResult?.consumeStream();

			await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
				threadId,
				status: { type: "ready", message: "Ready" },
			});
		}
	},
});

export const streamUserLearningPreference = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		payload: learningPreferenceValidator,
	},
	handler: async (ctx, { threadId, userId, payload }) => {
		const titleGenerationAgent = createAgent({
			agentType: "title-generation",
		});
		const contentGenerationAgent = createAgent({
			agentType: "course-content-generator",
		});
		const streamer = new DeltaStreamer(
			components.agent,
			ctx,
			{
				throttleMs: 100,
				onAsyncAbort: async () => console.error("Aborted asynchronously"),
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

		await Promise.all([
			contentGenerationAgent.saveMessages(ctx, {
				threadId,
				messages: _createToolResult(
					"streamUserLearningPreference",
					JSON.stringify({
						data: payload,
						message:
							"Thank to user for submitting their learning preferences. Make the output just one sentence.",
					}),
				),
				skipEmbeddings: true,
			}),
			ctx.runMutation(internal.chat.mutations.patchChatStatus, {
				threadId,
				status: {
					type: "streaming",
					message: "Processing learning preferences...",
				},
			}),
		]);

		const response = streamText({
			model: titleGenerationAgent.options.languageModel,
			prompt:
				"Thank the user for submitting their learning preferences.  After that, the system will start the learning workflow. Write the output in maximum 2 sentences.",
			onFinish: async (completion) => {
				const text = completion.text;
				await Promise.all([
					contentGenerationAgent.saveMessage(ctx, {
						threadId,
						message: {
							role: "assistant",
							content: text,
						},
					}),
					ctx.runAction(internal.chat.actions.startLearningWorkflow, {
						threadId,
						userId,
						agentType: "course-planner",
						payload,
					}),
				]);
			},
			onError: async (error) => {
				console.error(error);
				streamer.fail(JSON.stringify(error));
				await ctx.runMutation(internal.chat.mutations.patchChatStatus, {
					threadId,
					status: {
						type: "error",
						message: "Failed to generate learning content.",
					},
				});
			},
			abortSignal: streamer.abortController.signal,
		});

		await streamer.consumeStream(response.toUIMessageStream());
	},
});

/**
 * Start the learning workflow
 * This initiates the durable workflow for creating a learning plan
 */
export const startLearningWorkflow = internalAction({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
		payload: learningPreferenceValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { workflow } = await import("../workflow");

		// Start the workflow
		await workflow.start(ctx, internal.chat.workflow.createLearningWorkflow, {
			threadId: args.threadId,
			userId: args.userId,
			agentType: args.agentType,
			payload: args.payload,
		});

		return null;
	},
});
