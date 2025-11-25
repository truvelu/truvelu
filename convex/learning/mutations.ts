/**
 * Learning mutations
 * Single responsibility: Write operations for learning domain
 */

import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { createAgent } from "../agent";
import { SectionTypeValidator, learningChatStatusValidator } from "../schema";

/**
 * Create a new learning panel with initial setup
 */
export const createLearningPanel = mutation({
	args: {
		userId: v.string(),
		icon: v.optional(v.string()),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		type: SectionTypeValidator,
	},
	handler: async (ctx, args) => {
		const {
			userId,
			title = "New Learning",
			description = "",
			icon = "",
			type,
		} = args;

		const agent = createAgent({
			agentType: type === "plan" ? "course-planner" : "question-answering",
		});

		const [_learningId, { threadId }] = await Promise.all([
			ctx.db.insert("learning", {
				uuid: uuidv7(),
				userId,
				title,
				description,
				icon,
				activeStatus: "active",
			}),
			agent.createThread(ctx, {
				userId,
				title: "Initialize setup for learning",
			}),
		]);

		const _chatId = await ctx.db.insert("chats", {
			uuid: uuidv7(),
			threadId,
			userId,
			status: { type: "ready", message: "Ready to start conversation" },
			type: "plan",
		});

		await Promise.all([
			ctx.db.insert("plans", {
				title: "New Learning Plan",
				content: "",
				status: "draft",
				userId,
				chatId: _chatId,
			}),
			ctx.db.insert("learningChats", {
				chatId: _chatId,
				learningId: _learningId,
				userId,
			}),
			ctx.scheduler.runAfter(
				0,
				internal.learning.actions.generateGreetingMessageForLearnerAsync,
				{
					threadId,
					userId,
				},
			),
		]);

		const learning = await ctx.db.get(_learningId);

		if (!learning) {
			throw new Error("Failed to create learning");
		}

		return {
			success: true,
			threadId,
			uuid: learning?.uuid,
		};
	},
});

/**
 * Create learning content items (courses/modules)
 */
export const createLearningContent = mutation({
	args: {
		learningId: v.id("learning"),
		userId: v.string(),
		data: v.array(
			v.object({
				order: v.number(),
				title: v.string(),
				description: v.string(),
				learningObjectives: v.array(v.string()),
				priority: v.optional(v.union(v.string(), v.null())),
			}),
		),
	},
	handler: async (ctx, args) => {
		const { learningId, userId, data } = args;

		const promises = data.map(async (item) => {
			const { threadId } = await createAgent({
				agentType: "course-content-generator",
			}).createThread(ctx, {
				userId,
				title: item.title,
				summary: item.description ?? "",
			});

			const _chatId = await ctx.db.insert("chats", {
				uuid: uuidv7(),
				threadId,
				userId,
				status: { type: "ready", message: "Ready to start conversation" },
				type: "content",
			});

			const _learningChatId = await ctx.db.insert("learningChats", {
				chatId: _chatId,
				learningId,
				userId,
			});

			const _learningChatMetadataId = await ctx.db.insert(
				"learningChatMetadata",
				{
					learningChatId: _learningChatId,
					userId,
				},
			);

			await ctx.db.insert("learningChatMetadataContent", {
				learningChatMetadataId: _learningChatMetadataId,
				userId,
				order: item?.order,
				title: item?.title,
				description: item?.description ?? "",
				learningObjectives: item?.learningObjectives ?? [],
				priority: item?.priority ?? undefined,
				status: "draft",
			});

			return _learningChatId;
		});

		const learningChatIds = await Promise.all(promises);

		return {
			learningChatIds,
		};
	},
});

/**
 * Update learning title
 */
export const updateLearningTitle = mutation({
	args: {
		learningId: v.id("learning"),
		title: v.string(),
	},
	handler: async (ctx, { learningId, title }) => {
		return await ctx.db.patch(learningId, {
			title,
		});
	},
});

/**
 * Archive a learning and all its associated chats
 */
export const archiveLearning = mutation({
	args: {
		learningId: v.id("learning"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();

		const chatJoinLearningChatIds = learningChats.map(
			(learningChat) => learningChat.chatId,
		);

		const chats = await Promise.all(
			chatJoinLearningChatIds.map((chatId) => ctx.db.get(chatId)),
		);
		const chatThreadIds = chats.map((chat) => chat?.threadId).filter(Boolean);

		await Promise.all([
			...chatThreadIds.map((threadId) => {
				if (!threadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					internal.learning.actions.archiveLearningChat,
					{
						threadId,
					},
				);
			}),
		]);

		return await ctx.db.patch(learningId, {
			activeStatus: "archived",
		});
	},
});

/**
 * Delete a learning and all its associated data (cascade delete)
 * Uses helper functions for efficient batch deletion
 */
export const deleteLearning = mutation({
	args: {
		learningId: v.id("learning"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		// SECURITY: Verify ownership before proceeding
		const learning = await ctx.db.get(learningId);
		if (!learning) {
			throw new Error("Learning not found");
		}
		if (learning.userId !== userId) {
			throw new Error("Unauthorized: You don't own this learning");
		}

		const learningChats = await ctx.db
			.query("learningChats")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();

		const chatJoinLearningChatIds = learningChats.map(
			(learningChat) => learningChat.chatId,
		);
		const learningChatIds = learningChats.map((lc) => lc._id);

		const [chats, plans, learningChatMetadata] = await Promise.all([
			Promise.all(chatJoinLearningChatIds.map((chatId) => ctx.db.get(chatId))),
			Promise.all(
				chatJoinLearningChatIds.flatMap((chatId) =>
					ctx.db
						.query("plans")
						.withIndex("by_chatId_and_userId", (q) =>
							q.eq("chatId", chatId).eq("userId", userId),
						)
						.collect(),
				),
			),
			Promise.all(
				learningChatIds.flatMap((learningChatId) =>
					ctx.db
						.query("learningChatMetadata")
						.withIndex("by_learningChatId_and_userId", (q) =>
							q.eq("learningChatId", learningChatId).eq("userId", userId),
						)
						.collect(),
				),
			),
		]);

		const flatLearningChatMetadata = learningChatMetadata.flat();
		const learningChatMetadataIds = flatLearningChatMetadata
			.map((metadata) => metadata._id)
			.filter(Boolean);

		// Fetch learningChatMetadataContent for all metadata
		const learningChatMetadataContent = await Promise.all(
			learningChatMetadataIds.flatMap((metadataId) =>
				ctx.db
					.query("learningChatMetadataContent")
					.withIndex("by_learningChatMetadataId_and_userId", (q) =>
						q.eq("learningChatMetadataId", metadataId).eq("userId", userId),
					)
					.collect(),
			),
		);

		const chatThreadIds = chats.map((chat) => chat?.threadId).filter(Boolean);

		const flatPlans = plans.flat();
		const planIds = flatPlans.map((plan) => plan?._id).filter(Boolean);

		const planItems = await Promise.all(
			planIds.flatMap((planId) =>
				ctx.db
					.query("planItems")
					.withIndex("by_planId", (q) => q.eq("planId", planId))
					.collect(),
			),
		);
		const planMetadata = await Promise.all(
			planIds.flatMap((planId) =>
				ctx.db
					.query("planMetadata")
					.withIndex("by_planId", (q) => q.eq("planId", planId))
					.collect(),
			),
		);

		const flatPlanMetadata = planMetadata.flat();

		const planMetadataIds = flatPlanMetadata
			.map((planMetadata) => planMetadata?._id)
			.filter(Boolean);

		const planMetadataSearchQueries = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataSearchQueries")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);
		const planMetadataSearchResults = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataSearchResults")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);
		const planMetadataLearningRequirements = await Promise.all(
			planMetadataIds.flatMap((planMetadataId) =>
				ctx.db
					.query("planMetadataLearningRequirements")
					.withIndex("by_planMetadataId", (q) =>
						q.eq("planMetadataId", planMetadataId),
					)
					.collect(),
			),
		);

		const flatPlanItems = planItems.flat();
		const flatPlanMetadataSearchQueries = planMetadataSearchQueries.flat();
		const flatPlanMetadataSearchResults = planMetadataSearchResults.flat();
		const flatPlanMetadataLearningRequirements =
			planMetadataLearningRequirements.flat();
		const flatLearningChatMetadataContent = learningChatMetadataContent.flat();

		// Delete all related records in proper order
		// We delete children before parents to maintain referential integrity

		// Level 1: Delete deepest children
		await Promise.all([
			...flatPlanMetadataSearchQueries.map((item) => ctx.db.delete(item._id)),
			...flatPlanMetadataSearchResults.map((item) => ctx.db.delete(item._id)),
			...flatPlanMetadataLearningRequirements.map((item) =>
				ctx.db.delete(item._id),
			),
			...flatLearningChatMetadataContent.map((content) =>
				ctx.db.delete(content._id),
			),
		]);

		// Level 2: Delete planMetadata and planItems
		await Promise.all([
			...flatPlanMetadata.map((item) => ctx.db.delete(item._id)),
			...flatPlanItems.map((item) => ctx.db.delete(item._id)),
		]);

		// Level 3: Delete plans
		await Promise.all([...flatPlans.map((plan) => ctx.db.delete(plan._id))]);

		// Level 4: Delete learningChatMetadata and learningChats
		await Promise.all([
			...flatLearningChatMetadata.map((metadata) =>
				ctx.db.delete(metadata._id),
			),
			...learningChats.map((learningChat) => ctx.db.delete(learningChat._id)),
		]);

		// Level 5: Delete chats and schedule thread deletions
		await Promise.all([
			...chatJoinLearningChatIds.map((chatId) => ctx.db.delete(chatId)),
			...chatThreadIds.map((threadId) => {
				if (!threadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					internal.learning.actions.deleteLearningChat,
					{
						threadId,
					},
				);
			}),
		]);

		// Finally, delete the learning record itself
		await ctx.db.delete(learningId);

		return { success: true };
	},
});

/**
 * Update learning chat metadata status
 * Uses helper function for consistency
 */
export const updateLearningChatMetadataPlanStatus = mutation({
	args: {
		learningChatId: v.id("learningChats"),
		userId: v.string(),
		status: learningChatStatusValidator,
	},
	handler: async (ctx, args) => {
		// Use reusable helper instead of duplicating query logic
		await ctx.runMutation(api.learningChatMetadata.mutations.updateStatus, {
			learningChatId: args.learningChatId,
			userId: args.userId,
			status: args.status,
		});
	},
});
