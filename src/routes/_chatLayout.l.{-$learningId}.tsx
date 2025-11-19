import { AiLearningSkeleton } from "@/components/shared/ai-learning-skeleton";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

export const Route = createFileRoute("/_chatLayout/l/{-$learningId}")({
	component: RouteComponent,

	pendingComponent: AiLearningSkeleton,

	beforeLoad: async (context) => {
		if (!context.params.learningId) {
			throw redirect({
				to: "/",
			});
		}
	},
});

const AiLearning = lazy(() => import("@/components/shared/ai-learning"));

function RouteComponent() {
	return (
		<Suspense fallback={<AiLearningSkeleton />}>
			<AiLearning />
		</Suspense>
	);
}
