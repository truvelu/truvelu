import AiConversation from "@/components/shared/ai-conversation";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_chatLayout/l/{-$learningId}_/c/{-$chatId}",
)({
	component: RouteComponent,
	beforeLoad: (context) => {
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
	},
});

function RouteComponent() {
	return <AiConversation />;
}
