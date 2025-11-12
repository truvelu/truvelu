import {
	ContainerWithMargin,
	ContainerWithMaxWidth,
} from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const AiConversation = lazy(
	() => import("@/components/shared/ai-conversation"),
);

export const Route = createFileRoute("/_chatLayout/")({
	component: App,
});

function App() {
	return (
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
			<AiConversation />
		</Suspense>
	);
}
