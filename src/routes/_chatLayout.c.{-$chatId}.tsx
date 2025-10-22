import AiConversation from "@/components/shared/ai-conversation";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
	component: App,
	beforeLoad: (context) => {
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
});

function App() {
	return <AiConversation />;
}
