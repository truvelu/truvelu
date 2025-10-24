import AiConversation from "@/components/shared/ai-conversation";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
	component: App,
	beforeLoad: async (context) => {
		if (!context.context.userId) {
			throw redirect({
				to: "/auth",
			});
		}

		if (!context.params.chatId) {
			throw redirect({
				to: "/",
			});
		}

		await Promise.all([
			context.context.queryClient.prefetchQuery(
				convexQuery(api.auth.getCurrentUser, {}),
			),
			context.context.queryClient.prefetchQuery(
				convexQuery(api.chat.getChat, {
					userId: context.context.userId,
					uuid: context.params.chatId,
				}),
			),
		]);
	},
});

function App() {
	return <AiConversation />;
}
