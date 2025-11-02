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
			messageRange: { before: 1, after: 1 },
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
		modelId = "minimax/minimax-m2:free",
		// modelId = "x-ai/grok-4-fast",
		name = "Truvelu Fallback Agent",
		instructions = "You are a helpful assistant that can help the user with their question.",
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
				modelId: "minimax/minimax-m2:free",
				// modelId: "x-ai/grok-4-fast",
				name: "Question Answering Agent",
				instructions:
					"You are a question answering agent that helps the user with their question. You are also a helpful assistant that can help the user with their question.",
				...rest,
			});

		case "learning-generation":
			return createAgentPrivate({
				modelId: "minimax/minimax-m2:free",
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

		default:
			return createAgentPrivate({
				modelId,
				name,
				instructions,
				...rest,
			});
	}
}
