import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import { convexQuery, useConvexPaginatedQuery } from "@convex-dev/react-query";
import {
	ArrowMoveUpRightIcon,
	Calendar04Icon,
	Folder01Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../provider/auth-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "../ui/empty";
import { AiLearningSkeleton } from "./ai-learning-skeleton";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

function AiLearning() {
	const roomId = useGetRoomId();
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();

	const chatRoute = matchRoute({ to: "/c/{-$chatId}" });
	const pendingChatRoute = matchRoute({
		to: "/c/{-$chatId}",
		pending: true,
	});
	const currentlearningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const pendingLearningRoute = matchRoute({
		to: "/l/{-$learningId}",
		pending: true,
	});
	const currentLearningChatRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningChatRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentChatRoute = chatRoute !== false;
	const isPendingChatRoute = pendingChatRoute !== false;
	const isCurrentLearningRoute = currentlearningRoute !== false;
	const isPendingLearningRoute = pendingLearningRoute !== false;
	const isCurrentLearningChatRoute = currentLearningChatRoute !== false;
	const isPendingLearningChatRoute = pendingLearningChatRoute !== false;

	const isChatRoute = isCurrentChatRoute || isPendingChatRoute;
	const isLearningChatRoute =
		isCurrentLearningChatRoute || isPendingLearningChatRoute;
	const isLearningRoute =
		!(isChatRoute || isLearningChatRoute) &&
		(isCurrentLearningRoute || isPendingLearningRoute);

	const { userId } = useAuth();

	const { data: learning, isPending: isLearningPending } = useQuery(
		convexQuery(
			api.learning.queries.getLearningByRoomId,
			userId
				? {
						userId,
						uuid: roomId,
					}
				: "skip",
		),
	);

	const { results: learningChatsContent, status } = useConvexPaginatedQuery(
		api.learning.queries.getLearningChatsContentByLearningRoomId,
		isLearningRoute && !!roomId
			? {
					userId,
					uuid: roomId,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	useEffect(() => {
		if (!isLearningRoute) return;
		if (isLearningPending) return;
		if (!userId || !roomId) return;
		if (learning) return;

		navigate({ to: "/" })
			.then(() => {
				toast.error("Learning room not found");
			})
			.catch((error) => {
				console.error("Navigation error:", error);
				toast.error("Failed to navigate to home");
			});
	}, [navigate, userId, roomId, isLearningPending, isLearningRoute, learning]);

	if (status === "LoadingFirstPage") {
		return <AiLearningSkeleton />;
	}

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
									<div className="flex items-center justify-center size-9">
										<SharedIcon
											icon={Folder01Icon}
											size={36}
											className="size-6"
										/>
									</div>
									<h1 className="text-xl text-balance text-center max-md:text-left">
										{learning?.title}
									</h1>
								</div>

								<Button
									variant="outline"
									className="rounded-tlarge text-secondary-foreground"
								>
									Manage sources
								</Button>
							</div>

							<section className="pb-13">
								<ol className="group divide-y" aria-busy="false">
									{learningChatsContent?.length === 0 && (
										<Empty>
											<EmptyHeader>
												<EmptyMedia className="relative h-20 w-full">
													<SharedIcon
														icon={ArrowMoveUpRightIcon}
														strokeWidth={1}
														className="size-20 absolute top-1/2 left-1/2 -translate-x-1/6 -translate-y-1/2 text-secondary-foreground/30"
													/>
												</EmptyMedia>
												<EmptyTitle>No Course Yet</EmptyTitle>
												<EmptyDescription className="text-secondary-foreground/50">
													You haven&apos;t created any course yet. Get started
													by generate your first course by start chatting inside
													the chat section.
												</EmptyDescription>
											</EmptyHeader>
										</Empty>
									)}

									{learningChatsContent?.map((item) => (
										<li
											key={`${item.learningId}-${item.chatId}`}
											className="group/project-item hover:bg-secondary active:bg-secondary flex min-h-16 cursor-pointer items-center px-3 py-4 text-sm select-none"
										>
											<Link
												to={"/l/{-$learningId}/c/{-$chatId}"}
												params={{
													learningId: item.learningData.uuid,
													chatId: item.chatData?.uuid,
												}}
												className="w-full"
											>
												<div className="flex flex-col">
													{/* BADGE */}
													<div className="flex gap-1.5 mb-2">
														{item?.metadata?.priority && (
															<Badge
																className={cn(
																	"rounded-tlarge py-0 px-2.5 flex items-center justify-center h-6 bg-background ring-1 ring-sidebar-border text-sidebar-foreground",
																)}
															>
																{item?.metadata?.priority
																	.split("_")
																	.map(
																		(v) =>
																			v.charAt(0).toUpperCase() + v.slice(1),
																	)
																	.join(" ")}
															</Badge>
														)}

														{/* STATUS */}
														<Badge
															className={cn(
																"rounded-tlarge py-0 px-2.5 flex items-center justify-center h-6 bg-background ring-1 ring-sidebar-border text-sidebar-foreground",
															)}
														>
															{item?.metadata?.status}
														</Badge>
													</div>

													{/* TITLE AND DESCRIPTION */}
													<div className="flex w-full items-center gap-4 mb-0.5">
														<div className="grow overflow-hidden">
															<div className="text-sm font-medium">
																{item?.metadata?.title ?? ""}
															</div>
															<div className="min-h-0 truncate text-sm">
																{item?.metadata?.description ?? ""}
															</div>
														</div>

														<div className="relative flex min-h-10 min-w-10 items-center justify-between text-sm">
															<div className="absolute inset-0 flex items-center gap-1.5 translate-y-0 scale-95 opacity-0 group-hover/project-item:translate-y-0 group-hover/project-item:scale-100 group-hover/project-item:opacity-100"></div>
														</div>
													</div>

													{/* CREATION DATE */}
													<div className="flex items-center gap-1 text-secondary-foreground/70">
														<SharedIcon
															icon={Calendar04Icon}
															className="size-3.5"
														/>
														<p>
															Created at{" "}
															<span className="text-sm font-normal truncate">
																{new Date(
																	item.chatData?._creationTime ?? 0,
																).toLocaleDateString()}
															</span>
														</p>
													</div>
												</div>
											</Link>
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

export default AiLearning;
