import { AiLearningSkeleton } from "@/components/shared/ai-learning-skeleton";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
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

	loader: async (context) => {
		const userId = context.context.userId;
		const learningId = context.params.learningId;

		if (!userId || !learningId) return;

		await context.context.queryClient.ensureQueryData(
			convexQuery(api.learning.queries.getLearningByRoomId, {
				userId,
				uuid: learningId,
			}),
		);
	},
});

const AiLearning = lazy(() => import("@/components/shared/ai-learning"));

function RouteComponent() {
	return (
		<>
			<Authenticated>
				<Suspense fallback={<AiLearningSkeleton />}>
					<AiLearning />
				</Suspense>
			</Authenticated>
			<AuthLoading>
				<AiLearningSkeleton />
			</AuthLoading>
			<Unauthenticated>
				<AiLearningSkeleton />
			</Unauthenticated>
		</>
	);
}
