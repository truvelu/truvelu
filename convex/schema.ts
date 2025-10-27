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

export type ModelOptionsKey = Infer<typeof modelOptionsValidator>;

export default defineSchema({
	chats: defineTable({
		uuid: v.string(),
		threadId: v.string(),
		userId: v.string(),
	})
		.index("by_uuid", ["uuid"])
		.index("by_threadId", ["threadId"])
		.index("by_userId", ["userId"])
		.index("by_threadId_and_userId", ["threadId", "userId"])
		.index("by_uuid_and_userId", ["uuid", "userId"]),

	discussions: defineTable({
		chatId: v.id("chats"),
		messageId: v.string(),
		uuid: v.string(),
		threadId: v.string(),
		userId: v.string(),
	})
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"])
		.index("by_threadId", ["threadId"])
		.index("by_messageId_and_userId", ["messageId", "userId"]),
});
