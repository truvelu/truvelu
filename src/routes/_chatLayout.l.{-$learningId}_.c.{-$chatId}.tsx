import AiConversation from "@/components/shared/ai-conversation";
import { Button } from "@/components/ui/button";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

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
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();

	if (isLoading) {
		return <div className="p-4">Loading...</div>;
	}

	if (!isAuthenticated) {
		return (
			<div className="p-4">
				<Button
					onClick={() => navigate({ to: "/auth" })}
					className="w-full rounded-tmedium cursor-pointer"
				>
					Sign in
				</Button>
			</div>
		);
	}

	return <AiConversation />;
}
