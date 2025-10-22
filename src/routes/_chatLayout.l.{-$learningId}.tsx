import AiLearning from "@/components/shared/ai-learning";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/l/{-$learningId}")({
	component: RouteComponent,
	beforeLoad: (context) => {
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
});

function RouteComponent() {
	return <AiLearning />;
}
