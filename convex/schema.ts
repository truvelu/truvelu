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

export const chatModeValidator = v.union(v.literal("ask"), v.literal("agent"));

export const modelOptionsValidator = v.union(
	v.literal("google/gemma-3n-e4b-it"),
	v.literal("z-ai/glm-4.6"),
	v.literal("openai/gpt-5.1-chat"),
	v.literal("openai/gpt-5.1"),
	v.literal("x-ai/grok-4.1-fast"),
);

export const agentTypeValidator = v.union(
	v.literal("question-answering"),
	v.literal("title-generation"),
	v.literal("course-planner"),
	v.literal("course-content-generator"),
);

export const chatStatusValidator = v.union(
	v.object({
		type: v.literal("ready"),
		message: v.optional(v.string()),
	}),
	v.object({
		type: v.literal("submitted"),
		message: v.optional(v.string()),
	}),
	v.object({
		type: v.literal("streaming"),
		message: v.optional(v.string()),
	}),
	v.object({
		type: v.literal("need_approval"),
		message: v.optional(v.string()),
	}),
	v.object({
		type: v.literal("error"),
		message: v.optional(v.string()),
	}),
	v.object({
		type: v.literal("aborted"),
		message: v.optional(v.string()),
	}),
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

export const SectionTypeValidator = v.union(
	v.literal("main"),
	v.literal("discussion"),
	v.literal("plan"),
	v.literal("content"),
);

export const freeObjectValidator = v.optional(v.union(v.string(), v.any()));

export const learningPreferenceValidator = v.object({
	topic: v.optional(v.union(v.string(), v.null())),
	userLevel: v.optional(v.union(v.string(), v.null())),
	goal: v.optional(v.union(v.string(), v.null())),
	duration: v.optional(v.union(v.string(), v.null())),
	other: freeObjectValidator,
});

export type ModelOptionsKey = Infer<typeof modelOptionsValidator>;
export type SectionType = Infer<typeof SectionTypeValidator>;
export type ChatMode = Infer<typeof chatModeValidator>;

export default defineSchema({
	chats: defineTable({
		uuid: v.string(),
		threadId: v.string(),
		userId: v.string(),
		type: SectionTypeValidator,
		status: v.optional(chatStatusValidator),
	})
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
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"])
		.index("by_parentChatId", ["parentChatId"])
		.index("by_parentChatId_and_userId", ["parentChatId", "userId"]),

	learning: defineTable({
		uuid: v.string(),
		userId: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		icon: v.optional(v.string()),
		activeStatus: activeStatusValidator,
	})
		.index("by_userId_and_activeStatus", ["userId", "activeStatus"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	learningChats: defineTable({
		learningId: v.id("learning"),
		chatId: v.id("chats"),
		userId: v.string(),
	})
		.index("by_userId", ["userId"])
		.index("by_chatId_and_userId", ["chatId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	learningChatMetadata: defineTable({
		learningChatId: v.id("learningChats"),
		userId: v.string(),
	})
		.index("by_learningChatId", ["learningChatId"])
		.index("by_userId", ["userId"])
		.index("by_learningChatId_and_userId", ["learningChatId", "userId"]),

	learningChatMetadataContent: defineTable({
		learningChatMetadataId: v.id("learningChatMetadata"),
		userId: v.string(),
		order: v.number(),
		title: v.string(),
		description: v.string(),
		learningObjectives: v.array(v.string()),
		priority: v.optional(v.string()),
		status: learningChatStatusValidator,
	})
		.index("by_learningChatMetadataId", ["learningChatMetadataId"])
		.index("by_userId", ["userId"])
		.index("by_learningChatMetadataId_and_userId", [
			"learningChatMetadataId",
			"userId",
		])
		.index("by_status", ["status"]),

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
		userId: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		order: v.number(),
		status: planStatusValidator,
	})
		.index("by_planId", ["planId"])
		.index("by_planId_and_userId", ["planId", "userId"]),
});
