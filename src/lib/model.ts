import { modelOptionsValidator } from "convex/schema";
import { type Infer, v } from "convex/values";

export const withOptionalModelOptionsValidator = v.union(
	modelOptionsValidator,
	v.string(),
);

export type ModelOptionsKey = Infer<typeof modelOptionsValidator>;

export const MODELS: ReadonlyMap<
	ModelOptionsKey,
	{
		value: ModelOptionsKey;
		label: string;
		isReasoning: boolean;
	}
> = new Map([
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
