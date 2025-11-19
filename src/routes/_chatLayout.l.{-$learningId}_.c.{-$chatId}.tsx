import { AiConversationSkeleton } from "@/components/shared/ai-conversation-skeleton";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Suspense, lazy } from "react";

const AiLearningContent = lazy(
	() => import("@/components/shared/ai-learning-content"),
);

export const Route = createFileRoute(
	"/_chatLayout/l/{-$learningId}_/c/{-$chatId}",
)({
	component: RouteComponent,

	pendingComponent: AiConversationSkeleton,

	beforeLoad: async (context) => {
		if (!context.params.chatId) {
			throw redirect({
				to: "/",
			});
		}
	},

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

function RouteComponent() {
	return (
		<Suspense fallback={<AiConversationSkeleton />}>
			<AiLearningContent />
		</Suspense>
	);
}
