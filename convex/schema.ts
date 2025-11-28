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
		value: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected"),
			v.literal("answered"),
			v.literal("skipped"),
		),
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

export const chatTypeValidator = v.union(
	v.literal("main"),
	v.literal("discussion"),
	v.literal("plan"),
	v.literal("content"),
);

export const freeObjectValidator = v.optional(v.union(v.string(), v.any()));

export const learningPreferenceValidator = v.object({
	topic: v.optional(v.string()),
	userLevel: v.optional(v.string()),
	goal: v.optional(v.string()),
	duration: v.optional(v.string()),
	other: freeObjectValidator,
});

export type ModelOptionsKey = Infer<typeof modelOptionsValidator>;
export type SectionType = Infer<typeof chatTypeValidator>;
export type ChatMode = Infer<typeof chatModeValidator>;

export default defineSchema({
	chats: defineTable({
		uuid: v.string(),
		threadId: v.string(),
		userId: v.string(),
		type: chatTypeValidator,
		status: v.optional(chatStatusValidator),
	})
		.index("by_userId", ["userId"])
		.index("by_threadId_and_userId", ["threadId", "userId"])
		.index("by_uuid_and_userId", ["uuid", "userId"])
		.index("by_type_and_userId", ["type", "userId"]),

	// Generalized chat metadata table (replaces discussions)
	// Links chats to parent chats, messages, or learnings
	chatMetadatas: defineTable({
		chatId: v.id("chats"),
		userId: v.string(),
		// Optional: parent chat for discussion-type chats
		parentChatId: v.optional(v.id("chats")),
		// Optional: linked message ID for discussions on specific messages
		linkedMessageId: v.optional(v.string()),
		// Optional: linked learning for learning-related chats
		learningId: v.optional(v.id("learnings")),
	})
		.index("by_userId", ["userId"])
		.index("by_chatId_and_userId", ["chatId", "userId"])
		.index("by_linkedMessageId_and_userId", ["linkedMessageId", "userId"])
		.index("by_parentChatId_and_userId", ["parentChatId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	learnings: defineTable({
		uuid: v.string(),
		userId: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		icon: v.optional(v.string()),
		activeStatus: activeStatusValidator,
	})
		.index("by_userId_and_activeStatus", ["userId", "activeStatus"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	learningContents: defineTable({
		learningId: v.id("learnings"),
		chatId: v.id("chats"),
		userId: v.string(),
		order: v.number(),
		title: v.string(),
		description: v.string(),
		learningObjectives: v.array(v.string()),
		priority: v.optional(v.string()),
		status: chatStatusValidator,
	})
		.index("by_userId", ["userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	plans: defineTable({
		chatId: v.id("chats"),
		learningId: v.id("learnings"),
		parentId: v.optional(v.id("plans")),
		userId: v.string(),
		content: v.string(),
		title: v.string(),
		learningRequirements: v.object({
			topic: v.optional(v.string()),
			userLevel: v.optional(v.string()),
			goal: v.optional(v.string()),
			duration: v.optional(v.string()),
			other: freeObjectValidator,
		}),
		status: chatStatusValidator,
	})
		.index("by_userId", ["userId"])
		.index("by_chatId_and_userId", ["chatId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	// Renamed from planMappedSearchResults - now supports both plan and learning level
	mappedSearchResults: defineTable({
		userId: v.string(),
		// Optional: link to specific plan
		planId: v.optional(v.id("plans")),
		// Optional: link to learning (for learning-level resources)
		learningId: v.optional(v.id("learnings")),
		url: v.optional(v.string()),
		search: v.optional(v.string()),
		limit: v.optional(v.number()),
		ignoreSitemap: v.optional(v.boolean()),
		includeSubdomains: v.optional(v.boolean()),
	})
		.index("by_userId", ["userId"])
		.index("by_planId_and_userId", ["planId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	// Renamed from planSearchResults - now supports both plan and learning level
	searchResults: defineTable({
		userId: v.string(),
		// Optional: link to specific plan
		planId: v.optional(v.id("plans")),
		// Optional: link to learning (for learning-level resources)
		learningId: v.optional(v.id("learnings")),
		// Optional: reference to mapped URL
		mappedUrlId: v.optional(v.id("mappedSearchResults")),
		query: v.optional(v.string()),
		title: v.optional(v.string()),
		url: v.optional(v.string()),
		image: v.optional(v.string()),
		content: v.optional(v.string()),
		publishedDate: v.optional(v.string()),
		score: v.optional(v.number()),
		other: freeObjectValidator,
	})
		.index("by_userId", ["userId"])
		.index("by_planId_and_userId", ["planId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),

	planItems: defineTable({
		planId: v.id("plans"),
		userId: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		order: v.number(),
		status: chatStatusValidator,
	}).index("by_planId_and_userId", ["planId", "userId"]),

	// Renamed from planResources - now supports both plan and learning level
	resources: defineTable({
		userId: v.string(),
		// Optional: link to specific plan
		planId: v.optional(v.id("plans")),
		// Optional: link to learning (for learning-level resources)
		learningId: v.optional(v.id("learnings")),
		storageId: v.id("_storage"),
		fileName: v.string(),
		fileSize: v.number(),
		mimeType: v.string(),
	})
		.index("by_userId", ["userId"])
		.index("by_planId_and_userId", ["planId", "userId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),
});
