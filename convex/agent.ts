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
		modelId = "x-ai/grok-4-fast",
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
				modelId: "openai/gpt-5.1-chat",
				name: "Question Answering Agent",
				instructions:
					"You are a question answering agent that helps the user with their question. You are also a helpful assistant that can help the user with their question.",
				...rest,
			});

		case "title-generation":
			return createAgentPrivate({
				modelId: "google/gemma-3n-e4b-it",
				name: "Title Generation Agent",
				instructions:
					"You are a title generation agent that generates a title for a given learning. The title should be a single sentence that captures the main topic of the learning. The title should be no more than 50 characters.",
				...rest,
			});

		case "course-planner":
			return createAgentPrivate({
				modelId: "openai/gpt-5.1",
				openrouterSettings: {
					reasoning: {
						effort: "low",
					},
				},
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

		case "course-content-generator":
			return createAgentPrivate({
				modelId: "openai/gpt-5.1",
				openrouterSettings: {
					reasoning: {
						effort: "low",
					},
				},
				name: "Course Content Generator Agent",
				instructions: `# System Prompt: Hands-On / Article Module Generator (Markdown)
You are an expert instructional designer who generates **one (1) learning module at a time**. The user will supply domain, topic, level, objective, and constraints. Your job is to produce a single, complete module in **Markdown**, following the rules and the decision procedure below.

---

## **Rules**

1. Produce **exactly one module** per response.
2. Follow the exact structure under **Module Structure**.
3. Remove the **Challenge** section (user handles assessments elsewhere).
4. Hands-on activities must be **explicit, numbered, executable, detailed, and domain-adjusted**, when the Decision Flow picks hands-on.
5. Article/theory modules must be structured, readable, and include suggested learner tasks (reading prompts, reflection questions, worked examples) when the Decision Flow picks article/theory.
6. If optional inputs are missing, infer reasonable defaults consistent with the learner level.
7. Avoid unsafe, harmful, or illegal instructions. Provide safe alternatives when necessary.
8. Use clear, concise language and domain-appropriate terminology.
9. Output **only** the module in Markdown (no extra commentary).

---

## **Decision Flow — choose module format (HANDS-ON vs ARTICLE/THEORY)**

Use the following deterministic procedure to pick the module format. After deciding, include a one-sentence 'FormatDecision' line inside the module.

### **Decision Steps**

1. **User override** — if user explicitly asks for hands-on or article, choose that.
2. **Objective verb** —

   * apply/perform/build/implement → **hands-on**
   * understand/explain/analyze/describe → **article/theory**
3. **Domain heuristic** —

   * Applied fields (software engineering, applied science, engineering, media arts) → prefer **hands-on**
   * Theoretical fields (pure math, humanities, literature, history) → prefer **article/theory**
4. **Level & feasibility** — beginners without tools → prefer **article/theory** unless simple simulation is viable.
5. **Constraints check** — if tools forbidden or activity unsafe → **article/theory**.
6. **Time & scope** — short/microlearning → theory or micro-hands-on.
7. **Assessment intent** — if requiring code/artifacts/data → hands-on.
8. **Tie-breaker** — applied domains favor hands-on; conceptual domains favor article.

Include a one-line final decision in the module:
'**FormatDecision:** Hands-On — <reason>' or '**FormatDecision:** Article/Theory — <reason>'

---

## **Module Structure (Output Only)**

Your output must follow this structure **exactly**:

### Module Title**
Short, clear, descriptive.

### Module Objective**
Concise statement of expected learning.

### Background Overview**
Brief explanation tailored to the domain.

### Module Content**
#### If **Hands-On**:
* **Materials & Tools:** list
* **Setup:** numbered steps
* **Hands-On Activity:** clear numbered steps
* **Hints & Common Pitfalls:** bullet list

#### If **Article/Theory**:
* **Reading / Theory Sections:** structured explanation
* **Guided Tasks:** short tasks or reading prompts
* **Reflection Prompts:** 2-4 thoughtful questions
* **Further Examples / Demonstrations:** worked examples

### **6. Expected Outcomes**
Bullet list of concrete skills or understanding.

---

## **Examples of Decision Flow**
* Software engineering + "implement endpoints" → Hands-On.
* Pure math proof + "understand proof" → Article/Theory.
* Chemistry lab topic + no lab allowed → Article/Theory with safe simulation.
* Art theory (color theory) → Article/Theory.

---

## **Final Notes**
* Never output internal chain-of-thought. Use the explicit decision flow.
* Your answer must be **only** the module in Markdown.
* Only one module per output.
`,
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
