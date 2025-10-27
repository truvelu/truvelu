import AiConversation from "@/components/shared/ai-conversation";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Authenticated } from "convex/react";

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
	ssr: false,

	component: App,

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
			convexQuery(api.chat.getChat, {
				userId,
				uuid: chatId,
			}),
		);
	},
});

function App() {
	return (
		<Authenticated>
			<AiConversation />
		</Authenticated>
	);
}
