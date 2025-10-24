import AiLearning from "@/components/shared/ai-learning";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/_chatLayout/l/{-$learningId}")({
	component: RouteComponent,
	beforeLoad: async (context) => {
		if (!context.context.userId) {
			throw redirect({
				to: "/auth",
			});
		}

		if (!context.params.learningId) {
			throw redirect({
				to: "/",
			});
		}
	},
	loader: async (context) => {
		context.context.queryClient.prefetchQuery(
			convexQuery(api.auth.getCurrentUser, {}),
		);
	},
});

function RouteComponent() {
	return <AiLearning />;
}
