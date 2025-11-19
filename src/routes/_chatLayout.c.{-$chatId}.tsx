import { AiConversationSkeleton } from "@/components/shared/ai-conversation-skeleton";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Suspense, lazy } from "react";

const AiConversation = lazy(
	() => import("@/components/shared/ai-conversation"),
);

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
	component: App,

	pendingComponent: AiConversationSkeleton,

	loader: async (context) => {
		const userId = context.context.userId;
		const chatId = context.params.chatId;

		if (!userId || !chatId) return;

		await context.context.queryClient.ensureQueryData(
			convexQuery(api.chat.queries.getChat, {
				userId,
				uuid: chatId,
			}),
		);
	},
});

function App() {
	return (
		<Suspense fallback={<AiConversationSkeleton />}>
			<AiConversation />
		</Suspense>
	);
}
