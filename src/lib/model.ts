import { type ModelOptionsKey, modelOptionsValidator } from "convex/schema";
import { v } from "convex/values";

export const withOptionalModelOptionsValidator = v.union(
	modelOptionsValidator,
	v.string(),
);

export const MODELS: ReadonlyMap<
	ModelOptionsKey,
	{
		value: ModelOptionsKey;
		label: string;
		isReasoning: boolean;
	}
> = new Map([
	[
		"openrouter/polaris-alpha",
		{
			value: "openrouter/polaris-alpha",
			label: "OpenRouter: Polaris Alpha",
			isReasoning: false,
		},
	],
	[
		"google/gemma-3n-e4b-it",
		{
			value: "google/gemma-3n-e4b-it",
			label: "Google: Gemma 3N E4B IT",
			isReasoning: false,
		},
	],
	[
		"z-ai/glm-4.6",
		{
			value: "z-ai/glm-4.6",
			label: "Z-AI: GLM-4.6",
			isReasoning: true,
		},
	],
	[
		"x-ai/grok-4-fast",
		{
			value: "x-ai/grok-4-fast",
			label: "X-AI: Grok-4-Fast",
			isReasoning: true,
		},
	],
	[
		"openai/gpt-5",
		{
			value: "openai/gpt-5",
			label: "OpenAI: GPT-5",
			isReasoning: true,
		},
	],
]);

// Models known to support explicit reasoning configuration (e.g. reasoning.effort)

export function isReasoningModel(model?: ModelOptionsKey): boolean {
	if (!model) return false;
	return MODELS.get(model)?.isReasoning ?? false;
}
