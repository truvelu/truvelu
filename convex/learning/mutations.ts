/**
 * Learning mutations
 * Single responsibility: Write operations for learning domain
 */

import { v } from "convex/values";
import { v7 as uuidv7 } from "uuid";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { createAgent } from "../agent";
import { chatStatusValidator, chatTypeValidator } from "../schema";
import { _getOrThrowLearning, _getOrThrowLearningContent } from "./helpers";

/**
 * Create a new learning panel with initial setup
 */
export const createLearningPanel = mutation({
	args: {
		userId: v.string(),
		icon: v.optional(v.string()),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		type: chatTypeValidator,
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
			ctx.db.insert("learnings", {
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
				learningRequirements: {
					topic: undefined,
					userLevel: undefined,
					goal: undefined,
					duration: undefined,
					other: undefined,
				},
				status: { type: "ready", message: "Draft plan" },
				userId,
				chatId: _chatId,
				learningId: _learningId,
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
 * Now inserts directly into learningContents table
 */
export const createLearningContent = mutation({
	args: {
		learningId: v.id("learnings"),
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

		const learningContentIds = await Promise.all(
			data.map(async (item) => {
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

				// Insert directly into learningContents (consolidated table)
				const _learningContentId = await ctx.db.insert("learningContents", {
					learningId,
					chatId: _chatId,
					userId,
					order: item.order,
					title: item.title,
					description: item.description ?? "",
					learningObjectives: item.learningObjectives ?? [],
					priority: item.priority ?? undefined,
					status: { type: "ready", message: "Draft" },
				});

				return _learningContentId;
			}),
		);

		return {
			learningContentIds,
		};
	},
});

/**
 * Update learning title
 */
export const updateLearningTitle = mutation({
	args: {
		learningId: v.id("learnings"),
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
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		// Get all learning contents for this learning
		const learningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();

		const chatIds = learningContents.map((lc) => lc.chatId);

		const chats = await Promise.all(
			chatIds.map((chatId) => ctx.db.get(chatId)),
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
 */
export const deleteLearning = mutation({
	args: {
		learningId: v.id("learnings"),
		userId: v.string(),
	},
	handler: async (ctx, { learningId, userId }) => {
		// SECURITY: Verify ownership before proceeding
		await _getOrThrowLearning(ctx, { learningId, userId });

		// Get all learning contents for this learning
		const learningContents = await ctx.db
			.query("learningContents")
			.withIndex("by_learningId_and_userId", (q) =>
				q.eq("learningId", learningId).eq("userId", userId),
			)
			.collect();

		const learningContentChatIds = learningContents.map((lc) => lc.chatId);

		const [learningContentChats, plansByLearningId] = await Promise.all([
			Promise.all(
				learningContentChatIds.map((learningContentChatId) =>
					ctx.db.get(learningContentChatId),
				),
			),
			ctx.db
				.query("plans")
				.withIndex("by_learningId_and_userId", (q) =>
					q.eq("learningId", learningId).eq("userId", userId),
				)
				.collect(),
		]);

		const learningContentChatThreadIds = learningContentChats
			.map((learningContentChat) => learningContentChat?.threadId)
			.filter(Boolean);
		const planIds = plansByLearningId?.map((plan) => plan?._id);
		const planChatIds = plansByLearningId?.map((plan) => plan?.chatId);

		const planChatDatas = await Promise.all(
			planChatIds?.map((planChatId) => ctx.db.get(planChatId)),
		);

		const planChatThreadIds = planChatDatas
			?.map((planChat) => planChat?.threadId)
			.filter(Boolean);

		// Get plan items and search results (using renamed tables)
		const [planItems, searchResults] = await Promise.all([
			Promise.all(
				planIds.flatMap((planId) =>
					ctx.db
						.query("planItems")
						.withIndex("by_planId_and_userId", (q) =>
							q.eq("planId", planId).eq("userId", userId),
						)
						.collect(),
				),
			),
			Promise.all(
				planIds.flatMap((planId) =>
					ctx.db
						.query("searchResults")
						.withIndex("by_planId_and_userId", (q) =>
							q.eq("planId", planId).eq("userId", userId),
						)
						.collect(),
				),
			),
		]);

		const flatPlanItems = planItems.flat();
		const flatSearchResults = searchResults.flat();

		// Delete all related records in proper order
		// Level 1: Delete plan items and search results
		await Promise.all([
			...flatPlanItems.map((item) => ctx.db.delete(item._id)),
			...flatSearchResults.map((item) => ctx.db.delete(item._id)),
		]);

		// Level 2: Delete plan chats and learning content chats
		await Promise.all([
			...planChatIds.map((planChatId) => ctx.db.delete(planChatId)),
			...learningContentChatIds.map((learningContentChatId) =>
				ctx.db.delete(learningContentChatId),
			),
		]);

		// Level 3: Delete plans
		await Promise.all([
			...planIds.map((id) => ctx.db.delete(id)),
			...learningContents.map((lc) => ctx.db.delete(lc._id)),
		]);

		// Level 4: Delete chats and schedule thread deletions
		await Promise.all([
			...learningContentChatThreadIds.map((learningContentChatThreadId) => {
				if (!learningContentChatThreadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					internal.learning.actions.deleteLearningChat,
					{
						threadId: learningContentChatThreadId,
					},
				);
			}),
			...planChatThreadIds.map((planChatThreadId) => {
				if (!planChatThreadId) return Promise.resolve();
				return ctx.scheduler.runAfter(
					0,
					internal.learning.actions.deleteLearningChat,
					{
						threadId: planChatThreadId,
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
 * Update learning content status
 */
export const updateLearningContentStatus = mutation({
	args: {
		learningContentId: v.id("learningContents"),
		userId: v.string(),
		status: chatStatusValidator,
	},
	handler: async (ctx, args) => {
		await _getOrThrowLearningContent(ctx, {
			learningContentId: args.learningContentId,
			userId: args.userId,
		});

		await ctx.db.patch(args.learningContentId, {
			status: args.status,
		});

		return { success: true };
	},
});
