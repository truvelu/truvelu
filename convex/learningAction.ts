import { v } from "convex/values";
import { action } from "./_generated/server";
import { createAgent } from "./agent";

export const archiveLearningChat = action({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		const { thread } = await agent.continueThread(ctx, { threadId });
		await thread.updateMetadata({ status: "archived" });
	},
});

export const deleteLearningChat = action({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const agent = createAgent({
			agentType: "question-answering",
		});
		await agent.deleteThreadSync(ctx, { threadId });
	},
});
