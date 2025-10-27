import AiConversation from "@/components/shared/ai-conversation";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
	ssr: false,

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

		await context.context.queryClient.ensureQueryData(
			convexQuery(api.auth.getCurrentUser, {}),
		);

		if (!userId || !chatId) return;

		const chat = await context.context.queryClient.ensureQueryData(
			convexQuery(api.chat.getChat, {
				userId,
				uuid: chatId,
			}),
		);

		await context.context.queryClient.ensureQueryData(
			convexQuery(
				api.chat.listThreadMessages,
				chat?.threadId
					? {
							threadId: chat?.threadId ?? "",
							paginationOpts: {
								numItems: 20,
								cursor: null,
							},
						}
					: "skip",
			),
		);
	},
});

function App() {
	return <AiConversation />;
}
