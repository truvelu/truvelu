import {
	DeltaStreamer,
	compressUIMessageChunks,
	createTool,
} from "@convex-dev/agent";
import { generateObject, generateText, stepCountIs, streamText } from "ai";
import { v } from "convex/values";
import z from "zod";
import { api, components, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { createAgent } from "./agent";
import { agentTypeValidator } from "./schema";

const exaApiKey = process.env.EXA_API_KEY;

if (!exaApiKey) {
	throw new Error("EXA_API_KEY environment variable not set");
}

export const streamAsync = internalAction({
	args: {
		type: v.optional(v.union(v.literal("ask"), v.literal("learning"))),
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

		const [learningResult, askResult] = await Promise.all([
			type === "learning"
				? agent.streamText(
						ctx,
						{ threadId },
						{
							promptMessageId,
							system: `${agent.options.instructions}
					<tools>
					1. understandUserAnswer: Understand the user's answer about the user's learning preference.
					2. generateSearchQueries: Generate a search query for the user's learning plan.
					3. webSearch: Search the web for up-to-date educational content and resources about a specific topic.
					4. generateLearningList: Generate a learning list for the user's learning plan.
					</tools>
					<flow>
					1. Call the understandUserAnswer tool to understand the user's answer about the user's learning preference.
					2. If the user's answer is not full fill the question, call the understandUserAnswer tool again.
					3. If the user's answer is full fill the question, call the generateSearchQueries tool to generate a search query for the user's learning plan.
					4. Call the webSearch tool to find relevant, high-quality educational resources about the search query.
					5. Call the generateLearningList tool to generate a learning list for the user's learning plan based on the search results.
					</flow>
					<the-ask>
					- Follow the flow and call the tools to generate a learning list for the user's learning plan.
					- Don't write the learning list, just call the tools to generate it.
					- after learning list is generated, ask the user to see the learning list inside the learning dashboard, because the data will be shown there.
					</the-ask>`,
							stopWhen: stepCountIs(15),
							tools: {
								understandUserAnswer: createTool({
									description:
										"Understand the user's answer about the user's learning preference.",
									args: z.object({
										question: z
											.string()
											.describe(
												"The question that user just answered before this tool is called. Make it as detail as the original question. Don't assume or summarize the question, just use the original question.",
											),
										answer: z
											.string()
											.describe(
												"The user's answer to the question that user just answered before this tool is called. Make it as detail as the original answer. Don't assume or summarize the answer, just use the original answer.",
											),
									}),
									handler: async (ctx, { question, answer }) => {
										if (!ctx.threadId || !ctx.userId) {
											throw new Error("Thread ID or User ID is not set");
										}

										// Get last plan (for early validation before AI processing)
										const lastPlan = await ctx.runQuery(
											api.plan.getLastPlanByThreadId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										const userAnswerIsFullFillTheQuestion =
											await generateObject({
												model: agent.options.languageModel,
												system:
													"You need to determine if the user's answer is full fill the question about the user's learning preference. If it is, return true. If it is not, return false.",
												prompt: `
									<question>${question}</question>
									<user_answer>${answer}</user_answer>
									<the-ask>
									Map the user's answer to the question and return the user's preference based on the question:
									1. topic they want to learn about (mandatory),
									2. user level understanding of the topic (mandatory),
									3. user's goal for learning the topic (mandatory),
									4. the user's prefered duration for learning the topic (short: Crash Course, detailed: Course) (mandatory)
									</the-ask>
									`,
												schema: z.object({
													userPreference: z.object({
														topic: z
															.string()
															.or(z.null())
															.describe(
																"The topic the user wants to learn about. If the user doesn't provide the topic, return null.",
															),
														userLevel: z
															.string()
															.or(z.null())
															.describe(
																"The user's level understanding of the topic. If the user doesn't provide the user level, return null.",
															),
														goal: z
															.string()
															.or(z.null())
															.describe(
																"The user's goal for learning the topic. If the user doesn't provide the goal, return null.",
															),
														duration: z
															.string()
															.describe(
																"The user's prefered duration for learning the topic. If the user doesn't provide the duration, return null.",
															),
														other: z
															.record(z.string(), z.string())
															.optional()
															.default({})
															.describe(
																"Other user preferences. create the object with the key and value of the user's answer.",
															),
													}),
													questionIsNotFullFill: z
														.array(z.string())
														.describe(
															"The questions that are not full filled by the user's answer. Ignore the other attribute if it is not full filled.",
														),
												}),
											});

										if (
											userAnswerIsFullFillTheQuestion.object
												.questionIsNotFullFill.length > 0
										) {
											const analysis = await generateText({
												model: agent.options.languageModel,
												system: agent.options.instructions,
												prompt: `
										<question_that_not_full_filled>${userAnswerIsFullFillTheQuestion.object.questionIsNotFullFill.join(", ")}</question_that_not_full_filled>
										<the-ask>Ask again for the questions that are not full filled by the user's answer.</the-ask>`,
											});

											await ctx.runMutation(
												api.plan.upsertPlanMetadataLearningRequirements,
												{
													planId: lastPlan._id,
													userId: ctx.userId,
													data: {
														topic:
															userAnswerIsFullFillTheQuestion.object
																.userPreference.topic,
														userLevel:
															userAnswerIsFullFillTheQuestion.object
																.userPreference.userLevel,
														goal: userAnswerIsFullFillTheQuestion.object
															.userPreference.goal,
														duration:
															userAnswerIsFullFillTheQuestion.object
																.userPreference.duration,
														other:
															userAnswerIsFullFillTheQuestion.object
																.userPreference.other ?? {},
													},
												},
											);

											return JSON.stringify({
												data: { response: analysis.text },
												message:
													"Ask again for the questions that are not full filled by the user's answer. Stop the tool call until user give the full filled answer.",
											});
										}

										// Get plan with metadata details
										const { metadata } = await ctx.runAction(
											api.planAction.getLastPlanWithMetadataByThreadId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										const analysis = await generateObject({
											model: agent.options.languageModel,
											system: agent.options.instructions,
											prompt: `
									<question>${question}</question>
									<metadata>${JSON.stringify(metadata)}</metadata>
									<user_answer>${answer}</user_answer>
									<the-ask>Understand the user's answer and generate a analysis of the user's answer. The analysis should be a single sentence that captures the main topic of the user's answer. The analysis should be no more than 8 words.
									1. topic they want to learn about,
									2. user level understanding of the topic,
									3. user's goal for learning the topic
									4. the user's prefered duration for learning the topic (short: Crash Course, detailed: Course)
									</the-ask>`,
											schema: z.object({
												topic: z
													.string()
													.describe("The topic the user wants to learn about"),
												userLevel: z
													.string()
													.describe(
														"The user's level understanding of the topic",
													),
												goal: z
													.string()
													.describe("The user's goal for learning the topic"),
												duration: z
													.string()
													.describe(
														"The user's prefered duration for learning the topic",
													),
												other: z
													.record(z.string(), z.string())
													.optional()
													.default({})
													.describe(
														"Other user preferences. create the object with the key and value of the user's answer.",
													),
											}),
										});

										// Save the fully validated learning requirements
										await ctx.runMutation(
											api.plan.upsertPlanMetadataLearningRequirements,
											{
												planId: lastPlan._id,
												userId: ctx.userId,
												data: {
													topic: analysis.object.topic,
													userLevel: analysis.object.userLevel,
													goal: analysis.object.goal,
													duration: analysis.object.duration,
													other: analysis.object.other ?? {},
												},
											},
										);

										return JSON.stringify({
											data: { learningRequirement: analysis.object },
											message:
												"User preference saved. Continue to generate search queries.",
										});
									},
								}),
								generateSearchQueries: createTool({
									description:
										"Generate a search query for the user's learning plan based on the user preference that mentioned in the understandUserAnswer tool.",
									args: z.object({}),
									handler: async (ctx) => {
										if (!ctx.threadId || !ctx.userId) {
											throw new Error("Thread ID or User ID is not set");
										}

										// Get plan with metadata details using reusable function
										const { plan, metadata } = await ctx.runAction(
											api.planAction.getLastPlanWithMetadataByThreadId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										const searchQueriesObject = await generateObject({
											model: agent.options.languageModel,
											system: agent.options.instructions,
											prompt: `
									<metadata>${JSON.stringify(metadata?.detail?.learningRequirement)}</metadata>
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

										await ctx.runMutation(
											api.plan.upsertPlanMetadataSearchQuery,
											{
												planId: plan._id,
												userId: ctx.userId ?? "",
												data: searchQueriesObject.object.queriesOptions,
											},
										);

										return JSON.stringify({
											data: {
												planMetadataSearchQuery: searchQueriesObject?.object,
											},
											message:
												"Search queries generated successfully. Next continue to call the webSearch tool to find relevant, high-quality educational resources about the search query.",
										});
									},
								}),

								webSearch: createTool({
									description:
										"Search the web for up-to-date educational content and resources about a specific topic. Use this to find relevant articles, tutorials, documentation, and learning materials.",
									args: z.object({}),
									handler: async (ctx) => {
										const exaApiKey = process.env.EXA_API_KEY;

										if (!exaApiKey) {
											throw new Error(
												"EXA_API_KEY environment variable not set",
											);
										}

										if (!ctx.threadId || !ctx.userId) {
											throw new Error("Thread ID or User ID is not set");
										}

										// Get plan with metadata details using reusable function
										const { plan, metadata } = await ctx.runAction(
											api.planAction.getLastPlanWithMetadataByThreadId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										const planMetadataSearchQueries =
											metadata?.detail?.planMetadataSearchQueries ?? [];

										try {
											// Dynamic import to avoid bundling issues
											const Exa = (await import("exa-js")).default;
											const exa = new Exa(exaApiKey);

											const searchResultsToSave = [];

											for (const planMetadataSearchQuery of planMetadataSearchQueries) {
												const { results } = await exa.search(
													planMetadataSearchQuery?.query,
													{
														useAutoprompt: true,
														numResults:
															planMetadataSearchQuery?.other?.numResults ?? 3,
													},
												);
												const processedResults = results.map((result) => ({
													planMetadataSearchQueryId:
														planMetadataSearchQuery._id,
													title: result.title,
													url: result.url,
													image: result.image,
													content: null,
													publishedDate: result.publishedDate || null,
													score: result.score || null,
												}));
												searchResultsToSave.push(...processedResults);
												await new Promise((resolve) =>
													setTimeout(resolve, 1000),
												);

												// Save search results to database
												await ctx.runMutation(
													api.plan.upsertPlanMetadataSearchResult,
													{
														planId: plan._id,
														userId: ctx.userId,
														data: {
															searchResult: searchResultsToSave,
															other: {},
														},
													},
												);

												return JSON.stringify({
													data: searchResultsToSave.map((r) => ({
														title: r.title,
														url: r.url,
														image: r.image,
													})),
													message:
														"Web search is done. Continue to generate learning list.",
												});
											}
										} catch (error) {
											console.error("Exa search error:", error);
											throw new Error(
												`Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
											);
										}
									},
								}),

								generateLearningList: createTool({
									description:
										"Generate a learning list for the user's learning plan.",
									args: z.object({}),
									handler: async (ctx) => {
										if (!ctx.threadId || !ctx.userId) {
											throw new Error("Thread ID or User ID is not set");
										}

										// Get plan with metadata details using reusable function
										const { metadata } = await ctx.runAction(
											api.planAction.getLastPlanWithMetadataByThreadId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										const learningRequirement =
											metadata?.detail?.learningRequirement;
										const searchResults =
											metadata?.detail?.planMetadataSearchResults;

										const learningRequirementContent = `
										<topic>${learningRequirement?.topic}<topic>
										<user_level>${learningRequirement?.userLevel}<user_level>
										<goal>${learningRequirement?.goal}<goal>
										<duration>${learningRequirement?.duration}<duration>
										<other>${JSON.stringify(learningRequirement?.other)}<other>`;
										const searchResultsContent = searchResults?.map(
											(result, idx) =>
												`<search_result_${idx}>
										<title>${result.title}</title>
										<url>${result.url}</url>
										<content>${result.content}</content>
										</search_result_${idx}>`,
										);

										const [
											learningTitleGeneratext,
											learningListGenerateObject,
										] = await Promise.all([
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
													<search_results>${searchResultsContent?.join("\n\n")}</search_results>
													</metadata>
													<the-ask>Generate a title for the user's learning plan based on metadata. The title cannot be more than 50 characters.</the-ask>`,
											}),
											generateObject({
												model: agent.options.languageModel,
												system: agent.options.instructions,
												prompt: `
													<metadata>
													<learning_requirement>${learningRequirementContent}</learning_requirement>
													<search_results>${searchResultsContent?.join("\n\n")}</search_results>
													</metadata>

													<the-ask>Generate a learning list for the user's learning plan based on the search results.</the-ask>
													<output>After this tool is called, just ask the user to see the learning list inside the learning dashboard, because the data will be shown there.</output>`,
												schema: z.object({
													learningList: z.array(
														z.object({
															order: z
																.number()
																.describe("The order of the course"),
															title: z
																.string()
																.describe("The title of the course"),
															description: z
																.string()
																.describe("The description of the course"),
															learningObjectives: z
																.array(z.string())
																.describe(
																	"The learning objectives of the course",
																),
															priority: z
																.enum([
																	"must_know",
																	"should_know",
																	"nice_to_know",
																])
																.describe("The priority of the course"),
														}),
													),
												}),
											}),
										]);

										const chat = await ctx.runQuery(
											api.chat.getChatByThreadIdAndUserId,
											{
												threadId: ctx.threadId,
												userId: ctx.userId,
											},
										);

										if (!chat) {
											throw new Error("Chat not found");
										}

										const learningChat = await ctx.runQuery(
											api.learning.getLearningChatByChatId,
											{
												chatId: chat._id,
												userId: ctx.userId,
											},
										);

										if (!learningChat) {
											throw new Error("Learning chat not found");
										}

										await Promise.all([
											ctx.runMutation(api.learning.createLearningContent, {
												learningId: learningChat.learningId,
												userId: ctx.userId,
												data: learningListGenerateObject.object.learningList,
											}),
											ctx.runMutation(api.learning.updateLearningTitle, {
												learningId: learningChat.learningId,
												title: learningTitleGeneratext.text,
											}),
										]);

										return JSON.stringify({
											data: {
												learningList:
													learningListGenerateObject.object.learningList,
											},
											message:
												"Learning list generated successfully. Next continue to ask the user to see the learning list inside the learning dashboard, because the data will be shown there.",
										});
									},
								}),
							},
						},
						{
							saveStreamDeltas: {
								chunking: "word",
								throttleMs: 100,
							},
						},
					)
				: Promise.resolve(),

			type === "ask"
				? agent.streamText(
						ctx,
						{ threadId },
						{ promptMessageId },
						{
							saveStreamDeltas: {
								chunking: "word",
								throttleMs: 100,
							},
						},
					)
				: Promise.resolve(),

			ctx.runMutation(internal.chat.patchChatStatus, {
				threadId,
				status: "streaming",
			}),
		]);

		type === "learning" ? await learningResult?.consumeStream() : undefined;
		type === "ask" ? await askResult?.consumeStream() : undefined;
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
				userId: undefined,
			},
		);

		const response = streamText({
			model: agent.options.languageModel,
			system: agent.options.instructions,
			prompt: `Greet the learner in a friendly and engaging way. After that ask the user about:
			1. topic they want to learn about,
			2. user level understanding of the topic,
			3. user's goal for learning the topic
			4. the user's prefered duration for learning the topic (short: Crash Course, detailed: Course)`,
			onFinish: async (completion) => {
				const text = completion.text;
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
			onError: (error) => {
				console.error(error);
				streamer.fail(JSON.stringify(error));
			},
			abortSignal: streamer.abortController.signal,
		});

		await streamer.consumeStream(response.toUIMessageStream());
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
