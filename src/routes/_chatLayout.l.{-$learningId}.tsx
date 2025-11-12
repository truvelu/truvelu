import AiLearning from "@/components/shared/ai-learning";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Authenticated } from "convex/react";

export const Route = createFileRoute("/_chatLayout/l/{-$learningId}")({
	component: RouteComponent,

	beforeLoad: async (context) => {
		if (!context.params.learningId) {
			throw redirect({
				to: "/",
			});
		}
	},
});

function RouteComponent() {
	return (
		<Authenticated>
			<AiLearning />
		</Authenticated>
	);
}
