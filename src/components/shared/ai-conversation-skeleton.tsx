import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";

export function AiConversationSkeleton() {
	return (
		<div className="relative flex-1 sm:h-[calc(100lvh-var(--spacing-header))] [&>div]:[scrollbar-gutter:stable_both-edges]">
			<div className={cn("absolute inset-x-0 bottom-0 mx-4")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth className={cn("pb-2 flex-1")}>
						<Skeleton className="size-full h-[112px] rounded-tlarge bg-secondary" />
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</div>
	);
}
