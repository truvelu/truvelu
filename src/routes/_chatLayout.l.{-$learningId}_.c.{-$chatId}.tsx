import AiConversation from "@/components/shared/ai-conversation";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Authenticated } from "convex/react";

export const Route = createFileRoute(
	"/_chatLayout/l/{-$learningId}_/c/{-$chatId}",
)({
	ssr: false,

	component: RouteComponent,

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

function RouteComponent() {
	return (
		<Authenticated>
			<AiConversation />
		</Authenticated>
	);
}
