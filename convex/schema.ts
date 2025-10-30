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
	v.literal("minimax/minimax-m2:free"),
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
);

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
		.index("by_userId", ["userId"])
		.index("by_parentChatId_and_messageId", ["parentChatId", "messageId"])
		.index("by_parentChatId_and_userId", ["parentChatId", "userId"]),

	learning: defineTable({
		uuid: v.string(),
		userId: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		icon: v.optional(v.string()),
		activeStatus: v.optional(activeStatusValidator),
	})
		.index("by_uuid", ["uuid"])
		.index("by_userId", ["userId"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	learningHistories: defineTable({
		learningId: v.id("learning"),
		chatId: v.id("chats"),
		userId: v.string(),
	})
		.index("by_learningId", ["learningId"])
		.index("by_chatId", ["chatId"])
		.index("by_userId", ["userId"])
		.index("by_learningId_and_chatId", ["learningId", "chatId"])
		.index("by_learningId_and_userId", ["learningId", "userId"]),
});
