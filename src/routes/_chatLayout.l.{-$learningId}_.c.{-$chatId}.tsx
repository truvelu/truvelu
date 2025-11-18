import {
	ContainerWithMargin,
	ContainerWithMaxWidth,
} from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { Authenticated } from "convex/react";
import { Suspense, lazy } from "react";

const AiLearningContent = lazy(
	() => import("@/components/shared/ai-learning-content"),
);

export const Route = createFileRoute(
	"/_chatLayout/l/{-$learningId}_/c/{-$chatId}",
)({
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
			convexQuery(api.chat.queries.getChat, {
				userId,
				uuid: chatId,
			}),
		);
	},
});

function RouteComponent() {
	return (
		<Authenticated>
			<Suspense
				fallback={
					<div className="relative flex-1 sm:h-[calc(100lvh-var(--spacing-header))] [&>div]:[scrollbar-gutter:stable_both-edges]">
						<div className={cn("absolute inset-x-0 bottom-0 mx-4")}>
							<ContainerWithMargin>
								<ContainerWithMaxWidth className={cn("pb-2 flex-1")}>
									<Skeleton className="size-full h-[112px] rounded-tlarge bg-gray-200" />
								</ContainerWithMaxWidth>
							</ContainerWithMargin>
						</div>
					</div>
				}
			>
				<AiLearningContent />
			</Suspense>
		</Authenticated>
	);
}
