import type { GenericCtx } from "@convex-dev/better-auth";
import {
	type GenericActionCtx,
	type GenericMutationCtx,
	type GenericQueryCtx,
	defineSchema,
	defineTable,
} from "convex/server";
import { type Infer, v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

export type Context<T extends DataModel> =
	| GenericMutationCtx<T>
	| GenericQueryCtx<T>
	| GenericActionCtx<T>
	| GenericCtx<T>;

export const modelOptionsValidator = v.union(
	v.literal("google/gemma-3n-e4b-it"),
	v.literal("z-ai/glm-4.6"),
	v.literal("openai/gpt-5"),
	v.literal("x-ai/grok-4-fast"),
	v.literal("openrouter/polaris-alpha"),
);

export const agentTypeValidator = v.union(
	v.literal("question-answering"),
	v.literal("title-generation"),
	v.literal("learning-generation"),
	v.literal("course-planner"),
	v.literal("course-researcher"),
	v.literal("course-content-generator"),
);

export const chatStatusValidator = v.union(
	v.literal("ready"),
	v.literal("streaming"),
);

export const activeStatusValidator = v.union(
	v.literal("active"),
	v.literal("archived"),
);

export const streamSectionValidator = v.union(
	v.literal("thread"),
	v.literal("discussion"),
	v.literal("learning-creation"),
);

export const planStatusValidator = v.union(
	v.literal("draft"),
	v.literal("approved"),
	v.literal("generating"),
	v.literal("completed"),
);

export const learningChatStatusValidator = v.union(
	v.literal("draft"),
	v.literal("generating"),
	v.literal("completed"),
);

export const userLevelValidator = v.union(
	v.literal("beginner"),
	v.literal("intermediate"),
	v.literal("advanced"),
	v.literal("expert"),
);

export const durationValidator = v.union(
	v.literal("short"),
	v.literal("detailed"),
);

export const learningChatTypeValidator = v.union(
	v.literal("content"),
	v.literal("panel"),
);

export const freeObjectValidator = v.optional(v.union(v.string(), v.any()));

export type ModelOptionsKey = Infer<typeof modelOptionsValidator>;

export default defineSchema({
	chats: defineTable({
		uuid: v.string(),
		threadId: v.string(),
		userId: v.string(),
		status: v.optional(chatStatusValidator),
	})
		.index("by_uuid", ["uuid"])
		.index("by_threadId", ["threadId"])
		.index("by_userId", ["userId"])
		.index("by_threadId_and_userId", ["threadId", "userId"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	discussions: defineTable({
		chatId: v.id("chats"),
		parentChatId: v.id("chats"),
		messageId: v.string(),
		userId: v.string(), // Owner (denormalized for performance/security)
	})
		.index("by_chatId", ["chatId"])
		.index("by_parentChatId", ["parentChatId"])
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"]),

	learning: defineTable({
		uuid: v.string(),
		userId: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		icon: v.optional(v.string()),
		activeStatus: activeStatusValidator,
	})
		.index("by_uuid", ["uuid"])
		.index("by_userId", ["userId"])
		.index("by_userId_and_activeStatus", ["userId", "activeStatus"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	learningChats: defineTable({
		learningId: v.id("learning"),
		chatId: v.id("chats"),
		type: learningChatTypeValidator,
		userId: v.string(),
		metadata: v.optional(
			v.union(
				v.null(),
				v.object({
					plan: v.optional(
						v.object({
							order: v.number(),
							title: v.string(),
							description: v.string(),
							learningObjectives: v.array(v.string()),
							priority: v.optional(v.union(v.string(), v.null())),
							status: v.optional(learningChatStatusValidator),
						}),
					),
				}),
			),
		),
	})
		.index("by_learningId", ["learningId"])
		.index("by_chatId", ["chatId"])
		.index("by_userId", ["userId"])
		.index("by_chatId_and_userId", ["chatId", "userId"])
		.index("by_learningId_and_chatId", ["learningId", "chatId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	plans: defineTable({
		parentId: v.optional(v.id("plans")),
		chatId: v.id("chats"),
		userId: v.string(),
		content: v.string(),
		title: v.string(),
		status: planStatusValidator,
	})
		.index("by_userId", ["userId"])
		.index("by_chatId_and_userId", ["chatId", "userId"]),

	planMetadata: defineTable({
		planId: v.id("plans"),
		userId: v.string(),
	})
		.index("by_planId", ["planId"])
		.index("by_userId", ["userId"])
		.index("by_planId_and_userId", ["planId", "userId"]),

	planMetadataLearningRequirements: defineTable({
		planMetadataId: v.id("planMetadata"),
		userId: v.string(),
		topic: v.optional(v.union(v.string(), v.null())),
		userLevel: v.optional(v.union(v.string(), v.null())),
		goal: v.optional(v.union(v.string(), v.null())),
		duration: v.optional(v.union(v.string(), v.null())),
		other: freeObjectValidator,
	})
		.index("by_planMetadataId", ["planMetadataId"])
		.index("by_userId", ["userId"])
		.index("by_planMetadataId_and_userId", ["planMetadataId", "userId"]),

	planMetadataSearchQueries: defineTable({
		planMetadataId: v.id("planMetadata"),
		userId: v.string(),
		query: v.string(),
		other: freeObjectValidator,
	})
		.index("by_planMetadataId", ["planMetadataId"])
		.index("by_userId", ["userId"])
		.index("by_planMetadataId_and_userId", ["planMetadataId", "userId"]),

	planMetadataSearchResults: defineTable({
		planMetadataId: v.id("planMetadata"),
		planMetadataSearchQueryId: v.id("planMetadataSearchQueries"),
		userId: v.string(),
		title: v.optional(v.union(v.string(), v.null())),
		url: v.optional(v.union(v.string(), v.null())),
		image: v.optional(v.union(v.string(), v.null())),
		content: v.optional(v.union(v.string(), v.null())),
		publishedDate: v.optional(v.union(v.string(), v.null())),
		score: v.optional(v.union(v.number(), v.null())),
		other: freeObjectValidator,
	})
		.index("by_planMetadataId", ["planMetadataId"])
		.index("by_userId", ["userId"])
		.index("by_planMetadataId_and_userId", ["planMetadataId", "userId"]),

	planItems: defineTable({
		planId: v.id("plans"),
		title: v.string(),
		description: v.optional(v.string()),
		order: v.number(),
		status: planStatusValidator,
	})
		.index("by_planId", ["planId"])
		.index("by_planId_and_order", ["planId", "order"]),
});
