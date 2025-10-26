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
	},
	loader: async (context) => {
		const userId = context.context.userId;
		const chatId = context.params.chatId;

		if (!userId || !chatId) return;

		const chat = await context.context.queryClient.fetchQuery(
			convexQuery(api.chat.getChat, {
				userId,
				uuid: chatId,
			}),
		);

		await Promise.all([
			context.context.queryClient.prefetchQuery(
				convexQuery(api.auth.getCurrentUser, {}),
			),
			context.context.queryClient.prefetchQuery(
				convexQuery(api.chat.getChat, {
					userId,
					uuid: chatId,
				}),
			),
			context.context.queryClient.prefetchQuery(
				convexQuery(api.chat.listThreadMessages, {
					threadId: chat?.threadId ?? "",
					paginationOpts: {
						numItems: 20,
						cursor: null,
					},
				}),
			),
		]);
	},
});

function App() {
	return <AiConversation />;
}
