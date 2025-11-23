import { createArrayMock } from "@/lib/array-utils";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";

const LEARNING_SKELETON_PLACEHOLDERS = createArrayMock(10);

export function AiLearningSkeleton() {
	return (
		<div className="relative flex">
			<div className="h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))] flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] [overflow-anchor:none] transform-[translateZ(0)] will-change-scroll">
				<ContainerWithMargin>
					<ContainerWithMaxWidth
						className={cn(
							"flex-1 grid h-full grid-rows-[auto_min-content_min-content]",
						)}
					>
						<div className="flex min-w-0 flex-col self-start px-4 sm:px-0">
							<div className="z-20 sticky top-0 flex justify-between max-md:flex-col gap-0.5 max-md:gap-4 py-7 max-md:pt-4 bg-background px-3 items-start md:items-center">
								<div className="flex items-center gap-0.5 max-md:-translate-x-1">
									<Skeleton className="size-7" />
									<Skeleton className="w-24 h-8" />
								</div>

								<Skeleton className="h-9 w-[137.14px]" />
							</div>

							<section className="pb-13">
								<ol
									className="divide-token-bg-tertiary group divide-y"
									aria-busy="false"
								>
									{LEARNING_SKELETON_PLACEHOLDERS.map((index) => (
										<li
											key={`learning_skeleton_${index}`}
											className="min-h-16 p-3"
										>
											<Skeleton className="w-[calc(100%-1.5rem)] h-[14px] my-[3px]" />
											<Skeleton className="w-[calc(100%-1.5rem)] h-[14px] my-[3px]" />
										</li>
									))}
								</ol>
							</section>
						</div>
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</div>
	);
}
