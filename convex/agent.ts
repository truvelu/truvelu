import { Agent, type Config } from "@convex-dev/agent";
import {
	type OpenRouterProvider,
	createOpenRouter,
} from "@openrouter/ai-sdk-provider";
import type { CallSettings } from "ai";
import { jina } from "jina-ai-provider";
import { components } from "./_generated/api";
import type { ModelOptionsKey } from "./schema";

export interface AgentProps {
	modelId: ModelOptionsKey;
	openrouterSettings?: Parameters<OpenRouterProvider["chat"]>[1];
	settings?: CallSettings;
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
	settings,
}: AgentProps) => {
	const languageModel = openrouter.chat(modelId, openrouterSettings);
	const textEmbeddingModel = jina.textEmbeddingModel("jina-embeddings-v3");

	return {
		languageModel,
		textEmbeddingModel,
		contextOptions: {
			excludeToolMessages: false,
			recentMessages: 10,
			searchOptions: {
				limit: 10,
				textSearch: false,
				vectorSearch: true,
				messageRange: { before: 1, after: 1 },
			},
			searchOtherThreads: false,
		},

		storageOptions: {
			saveMessages: "all",
		},
		callSettings: settings,
	} satisfies Config;
};

export function createChatAgentWithModel({
	modelId,
	openrouterSettings,
	settings,
}: AgentProps) {
	return new Agent(components.agent, {
		name: "TruLabs Chat Agent",
		instructions: "help the user with their question",
		...agentSharedDefaults({ modelId, openrouterSettings, settings }),
	});
}
