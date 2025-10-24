import AiConversation from "@/components/shared/ai-conversation";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute(
	"/_chatLayout/l/{-$learningId}_/c/{-$chatId}",
)({
	component: RouteComponent,
	beforeLoad: async (context) => {
		if (!context.context.userId) {
			throw redirect({
				to: "/auth",
			});
		}

		if (!!context.params.learningId && !context.params.chatId) {
			throw redirect({
				to: "/l/{-$learningId}",
			});
		}

		if (!context.params.learningId && !context.params.chatId) {
			throw redirect({
				to: "/",
			});
		}

		await context.context.queryClient.prefetchQuery(
			convexQuery(api.auth.getCurrentUser, {}),
		);
	},
});

function RouteComponent() {
	return <AiConversation />;
}
