import {
	Agent,
	type Config,
	type ContextOptions,
	type StorageOptions,
} from "@convex-dev/agent";
import {
	type OpenRouterProvider,
	createOpenRouter,
} from "@openrouter/ai-sdk-provider";
import type { Infer } from "convex/values";
import { jina } from "jina-ai-provider";
import { components } from "./_generated/api";
import type { ModelOptionsKey, agentTypeValidator } from "./schema";

export type RawAgentArgs = ConstructorParameters<typeof Agent>;
export type RawAgentConfig = RawAgentArgs[1];
export type AgentExtras = RawAgentConfig extends Config & infer Rest
	? Rest
	: RawAgentConfig extends infer Rest & Config
		? Rest
		: never;

export interface AgentParameters
	extends Omit<RawAgentConfig, "languageModel" | "textEmbeddingModel"> {
	modelId: ModelOptionsKey;
	openrouterSettings?: Parameters<OpenRouterProvider["chat"]>[1];
}

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const jinaApiKey = process.env.JINA_API_KEY;

if (!openrouterApiKey) {
	throw new Error("OPENROUTER_API_KEY environment variable not set");
}
if (!jinaApiKey) {
	throw new Error("JINA_API_KEY environment variable not set");
}

export const openrouter = createOpenRouter({
	apiKey: openrouterApiKey,
});

export const agentSharedDefaults = ({
	modelId,
	openrouterSettings,
	...rest
}: AgentParameters) => {
	const { contextOptions, storageOptions } = rest;
	const languageModel = openrouter.chat(modelId, openrouterSettings);
	const textEmbeddingModel = jina.textEmbeddingModel("jina-embeddings-v3");

	const defaultContextOptions: ContextOptions = {
		excludeToolMessages: false,
		recentMessages: 10,
		searchOptions: {
			limit: 10,
			textSearch: false,
			vectorSearch: true,
			messageRange: { before: 5, after: 5 },
		},
		searchOtherThreads: false,
	};

	const defaultStorageOptions: StorageOptions = {
		saveMessages: "all",
	};

	return {
		languageModel,
		textEmbeddingModel,
		contextOptions: contextOptions ?? defaultContextOptions,
		storageOptions: storageOptions ?? defaultStorageOptions,
		...rest,
	} satisfies Config;
};

// createChatAgentWithModel -> createAgent;
export function createAgent(
	parameters: Partial<AgentParameters> & {
		agentType: Infer<typeof agentTypeValidator>;
	},
) {
	const {
		agentType,
		modelId = "openrouter/polaris-alpha",
		// modelId = "x-ai/grok-4-fast",
		name = "Truvelu Fallback Agent",
		instructions = "<instructions>You are a helpful assistant that can help the user with their question.</instructions>",
		...rest
	} = parameters ?? {};

	const createAgentPrivate = (parameters: AgentParameters) => {
		return new Agent(components.agent, {
			...agentSharedDefaults(parameters),
		});
	};

	switch (agentType) {
		case "question-answering":
			return createAgentPrivate({
				modelId: "openrouter/polaris-alpha",
				// modelId: "x-ai/grok-4-fast",
				name: "Question Answering Agent",
				instructions:
					"You are a question answering agent that helps the user with their question. You are also a helpful assistant that can help the user with their question.",
				...rest,
			});

		case "learning-generation":
			return createAgentPrivate({
				modelId: "openrouter/polaris-alpha",
				// modelId: "x-ai/grok-4-fast",
				name: "Learning Generation Agent",
				instructions:
					"You are a learning generation agent that generates a learning for a given topic. The learning should be a single sentence that captures the main topic of the learning.",
				...rest,
			});

		case "title-generation":
			return createAgentPrivate({
				modelId: "google/gemma-3n-e4b-it",
				name: "Title Generation Agent",
				instructions:
					"You are a title generation agent that generates a title for a given learning. The title should be a single sentence that captures the main topic of the learning. The title should be no more than 8 words.",
				...rest,
			});

		case "course-planner":
			return createAgentPrivate({
				modelId: "openrouter/polaris-alpha",
				// modelId: "x-ai/grok-4-fast",
				name: "Course Planner Agent",
				instructions: `<instructions>You are a course planner agent that creates comprehensive learning paths for students.

Your responsibilities:
1. Understand the learner's topic, current level, and goals
2. Create a structured learning path with clear, actionable items
3. Organize topics in a logical progression from foundational to advanced
4. Label each item as "must_know" (essential foundations), "should_know" (important skills), or "nice_to_know" (advanced/supplementary topics)
5. Provide clear descriptions for each learning item
6. Create a summary of the overall learning plan

Keep learning items focused and specific. Each item should represent a concrete topic or skill to master. Aim for 8-15 items total, with proper balance across labels.</instructions>`,
				...rest,
			});

		case "course-researcher":
			return createAgentPrivate({
				modelId: "openrouter/polaris-alpha",
				// modelId: "x-ai/grok-4-fast",
				name: "Course Researcher Agent",
				instructions: `<instructions>You are a course researcher agent that finds high-quality educational content on the web.

Your responsibilities:
1. Take a specific learning topic and generate effective search queries
2. Use the web_search tool to find relevant, high-quality educational resources
3. Evaluate search results for educational value and relevance
4. Gather diverse perspectives and resources (tutorials, documentation, articles, videos)
5. Ensure content is appropriate for the learner's level

Focus on finding authoritative sources, clear explanations, and practical examples. Search queries should be specific and education-focused.</instructions>`,
				...rest,
			});

		case "course-content-generator":
			return createAgentPrivate({
				modelId: "openrouter/polaris-alpha",
				// modelId: "x-ai/grok-4-fast",
				name: "Course Content Generator Agent",
				instructions: `<instructions>You are a course content generator agent that creates engaging, comprehensive educational content.

Structure your content with:
- Clear introduction explaining what will be learned
- Core concepts with detailed explanations
- Use proper article structure like headings, subheadings, paragraphs, bullets, numbering, code snippet, and etc.
- Giving examples like code snippets, math equations, and etc. (if applicable)
- Summary of key takeaways
- suggested next steps or related topics

Write in a clear, engaging style appropriate for the learner's level. Make complex topics accessible.</instructions>`,
				...rest,
			});

		default:
			return createAgentPrivate({
				modelId,
				name,
				instructions: `<instructions>${instructions}</instructions>`,
				...rest,
			});
	}
}
