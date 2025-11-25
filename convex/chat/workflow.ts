import { v } from "convex/values";
import { internal } from "../_generated/api";
import { agentTypeValidator, learningPreferenceValidator } from "../schema";
import { workflow } from "../workflow";

/**
 * Learning workflow that orchestrates the complete learning plan creation process
 * This workflow runs durably and can survive server restarts
 */
export const createLearningWorkflow = workflow.define({
	args: {
		threadId: v.string(),
		userId: v.string(),
		agentType: agentTypeValidator,
		payload: learningPreferenceValidator,
	},
	returns: v.null(),
	handler: async (step, args): Promise<null> => {
		const lastPlanWithMetadata = await step.runAction(
			internal.plan.actions.getLastPlanWithMetadataByThreadId,
			{
				threadId: args.threadId,
				userId: args.userId,
			},
		);

		await Promise.all([
			step.runMutation(internal.chat.mutations.patchChatStatus, {
				threadId: args.threadId,
				status: { type: "streaming", message: "Generating learning plan" },
			}),
			step.runMutation(internal.plan.mutations.updatePlanStatus, {
				planId: lastPlanWithMetadata.plan._id,
				status: "generating",
			}),
		]);

		// Step 1: Let AI gather learning requirements through conversation
		// This step will keep asking until all requirements are fulfilled
		// The AI will handle the conversation with the user through streaming

		// Step 2: Generate search queries based on learning requirements
		await step.runAction(
			internal.chat.actions.generateSearchQueriesTool,
			{
				threadId: args.threadId,
				userId: args.userId,
				agentType: args.agentType,
			},
			{
				name: "Generate Search Queries",
				retry: true,
			},
		);

		await step.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId: args.threadId,
			status: { type: "streaming", message: "Performing web search" },
		});

		// Step 3: Perform web search to find educational resources
		await step.runAction(
			internal.chat.actions.webSearchTool,
			{
				threadId: args.threadId,
				userId: args.userId,
				agentType: args.agentType,
			},
			{
				name: "Web Search",
				retry: true,
			},
		);

		await step.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId: args.threadId,
			status: { type: "streaming", message: "Generating learning list" },
		});

		// Step 4: Generate the learning list from search results
		await step.runAction(
			internal.chat.actions.generateLearningListTool,
			{
				threadId: args.threadId,
				userId: args.userId,
				agentType: args.agentType,
			},
			{
				name: "Generate Learning List",
				retry: true,
			},
		);

		await step.runMutation(internal.chat.mutations.patchChatStatus, {
			threadId: args.threadId,
			status: { type: "streaming", message: "Streaming learning content" },
		});

		// Step 5: Stream generate the detailed learning content
		await step.runAction(
			internal.chat.actions.streamGenerateLearningContentTool,
			{
				threadId: args.threadId,
				userId: args.userId,
				agentType: args.agentType,
			},
			{
				name: "Stream Learning Content",
				retry: true,
			},
		);

		await Promise.all([
			step.runMutation(internal.chat.mutations.patchChatStatus, {
				threadId: args.threadId,
				status: { type: "ready", message: "Ready" },
			}),
			step.runMutation(internal.plan.mutations.updatePlanStatus, {
				planId: lastPlanWithMetadata.plan._id,
				status: "completed",
			}),
		]);

		return null;
	},
});
