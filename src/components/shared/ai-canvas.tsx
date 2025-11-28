import { MATH_MARKDOWN } from "@/constants/messages";
import {
	useActiveCanvasId,
	useCanvasList,
	useCanvasOpenStatus,
} from "@/hooks/use-canvas";
import { useEditableTitle } from "@/hooks/use-editable-title";
import { useGetComponentSize } from "@/hooks/use-get-component-size";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import {
	type CanvasPayload,
	CanvasType,
	useCanvasStore,
} from "@/zustand/canvas";
import { convexQuery, useConvexPaginatedQuery } from "@convex-dev/react-query";
import {
	Add01Icon,
	Cancel01Icon,
	Clock02Icon,
	Delete02Icon,
	Edit03Icon,
	File01Icon,
	GridIcon,
	MoreHorizontalIcon,
	TaskDaily02Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { useMatchRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import {
	Suspense,
	lazy,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { Response } from "../ai-elements/response";
import { useAuth } from "../provider/auth-provider";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AiConversationSkeleton } from "./ai-conversation-skeleton";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

const AiConversation = lazy(
	() => import("@/components/shared/ai-conversation"),
);

interface CanvasTabTriggerProps {
	canvas: CanvasPayload & { icon?: typeof File01Icon; title?: string };
	isActive: boolean;
}

const CanvasTabTriggerWithActiveState = memo(
	({
		className,
		children,
		...otherProps
	}: React.ComponentProps<typeof TabsTrigger>) => {
		return (
			<TabsTrigger
				className={cn(
					"cursor-pointer data-[state=active]:border data-[state=active]:border-sidebar-border shadow-none!",
					className,
				)}
				{...otherProps}
			>
				{children}
			</TabsTrigger>
		);
	},
);

const CanvasTabTrigger = memo(({ canvas, isActive }: CanvasTabTriggerProps) => {
	const { userId } = useAuth();
	const { upsertCanvas, removeCanvas } = useCanvasStore(
		useShallow(({ upsertCanvas, removeCanvas }) => ({
			upsertCanvas,
			removeCanvas,
		})),
	);

	const updateChatTitle = useAction(api.chat.actions.updateChatTitle);
	const deleteDiscussion = useAction(api.discussion.actions.deleteDiscussion);

	const threadId = canvas?.data?.threadId ?? "";
	const roomId = canvas?.data?.roomId ?? "";

	const { data: canvasMetadata } = useQuery(
		convexQuery(api.chat.queries.getMetadata, threadId ? { threadId } : "skip"),
	);

	const { editableRef, isEditing, startEditing, handleKeyDown, handleBlur } =
		useEditableTitle({
			onSave: (newTitle) => {
				if (!threadId) return;
				updateChatTitle({
					threadId,
					title: newTitle,
				});
				upsertCanvas({
					...canvas,
					data: canvas.data
						? {
								...canvas.data,
								title: newTitle,
							}
						: null,
				});
			},
		});

	const handleRemoveCanvas = useCallback(() => {
		removeCanvas({
			type: canvas.type,
			threadId,
			roomId,
		});
	}, [canvas.type, threadId, roomId, removeCanvas]);

	useEffect(() => {
		if (!canvasMetadata?.title) return;
		if (canvasMetadata?.title === canvas?.data?.title) return;
		upsertCanvas({
			id: canvas.id,
			type: canvas.type,
			data: {
				title: canvasMetadata?.title ?? "",
				threadId,
				roomId,
			},
		});
	}, [canvasMetadata?.title, threadId, roomId, canvas, upsertCanvas]);

	return (
		<>
			<div data-tab-id={canvas.id} className="relative">
				<CanvasTabTriggerWithActiveState
					value={canvas.id}
					className={cn(
						"cursor-pointer data-[state=active]:border data-[state=active]:border-sidebar-border shadow-none!",
						"pl-1.5 rounded-tlarge gap-0.5 h-7 py-0",
						!isActive ? "pr-4" : "pr-7",
					)}
				>
					{canvas.icon ? (
						<SharedIcon icon={canvas.icon} />
					) : (
						<>
							{canvas.type === CanvasType.THREAD && (
								<div className="size-5 flex items-center justify-center">
									<SharedIcon icon={GridIcon} className="size-4" />
								</div>
							)}

							{canvas.type === CanvasType.LEARNING_CREATION && (
								<div className="size-5 flex items-center justify-center">
									<SharedIcon icon={TaskDaily02Icon} className="size-4" />
								</div>
							)}

							<span
								ref={editableRef}
								onKeyDown={handleKeyDown}
								onBlur={handleBlur}
								className={isEditing ? "outline-none" : ""}
							>
								{canvas?.title}
							</span>
						</>
					)}
				</CanvasTabTriggerWithActiveState>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"absolute right-1 top-1/2 -translate-y-1/2 rounded-full size-fit cursor-pointer p-0.5 z-10",
								!isActive && "hidden",
							)}
						>
							<SharedIcon icon={MoreHorizontalIcon} className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="bottom"
						align="end"
						className="rounded-tmedium"
					>
						<DropdownMenuItem
							className="p-2.5 rounded-xl"
							onClick={handleRemoveCanvas}
						>
							<SharedIcon icon={Cancel01Icon} />
							<span>Close</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							className="p-2.5 rounded-xl"
							onClick={startEditing}
						>
							<SharedIcon icon={Edit03Icon} />
							<span>Rename</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="p-2.5 rounded-xl"
							onClick={async () => {
								if (!threadId) return;
								await deleteDiscussion({ threadId, userId });
								handleRemoveCanvas();
							}}
						>
							<SharedIcon icon={Delete02Icon} className="text-destructive" />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);
});

const AiCanvasHeader = memo(
	({ canvasTabs }: { canvasTabs: CanvasPayload[] }) => {
		const roomId = useGetRoomId();
		const matchRoute = useMatchRoute();
		const canvasList = useCanvasList();
		const activeCanvasId = useActiveCanvasId();

		const currentLearningRoute = matchRoute({ to: "/l/{-$learningId}" });
		const pendingLearningRoute = matchRoute({
			to: "/l/{-$learningId}",
			pending: true,
		});
		const currentChatRoute = matchRoute({ to: "/c/{-$chatId}" });
		const pendingChatRoute = matchRoute({
			to: "/c/{-$chatId}",
			pending: true,
		});
		const currentLearningChatRoute = matchRoute({
			to: "/l/{-$learningId}/c/{-$chatId}",
		});
		const pendingLearningChatRoute = matchRoute({
			to: "/l/{-$learningId}/c/{-$chatId}",
			pending: true,
		});

		const isCurrentLearningRoute = currentLearningRoute !== false;
		const isPendingLearningRoute = pendingLearningRoute !== false;
		const isCurrentChatRoute = currentChatRoute !== false;
		const isPendingChatRoute = pendingChatRoute !== false;
		const isCurrentLearningChatRoute = currentLearningChatRoute !== false;
		const isPendingLearningChatRoute = pendingLearningChatRoute !== false;

		const isLearningChatRoute =
			isCurrentLearningChatRoute || isPendingLearningChatRoute;
		const isLearningRoute =
			!isLearningChatRoute &&
			(isCurrentLearningRoute || isPendingLearningRoute);
		const isChatRoute = isCurrentChatRoute || isPendingChatRoute;
		const isIndexRoute = !isLearningRoute && !isChatRoute;

		const { removeCanvas, clearCanvas, clearOtherCanvas, setOpenCanvas } =
			useCanvasStore(
				useShallow(
					({ removeCanvas, clearCanvas, clearOtherCanvas, setOpenCanvas }) => ({
						removeCanvas,
						clearCanvas,
						clearOtherCanvas,
						setOpenCanvas,
					}),
				),
			);

		const { ref: headerActionsRef, width: headerActionsWidth } =
			useGetComponentSize<HTMLDivElement>();
		const scrollRef = useRef<HTMLDivElement>(null);

		const [dropdownOpen, setDropdownOpen] = useState(false);

		const isListActive = activeCanvasId === "list";

		const activeCanvas = canvasList.find(
			(canvas) => canvas.id === activeCanvasId,
		);

		const sentinelScroll = useCallback((id: string) => {
			const container = scrollRef.current;
			if (!container) return;
			const sentinelElement = container.querySelector(`[data-tab-id="${id}"]`);
			if (sentinelElement) {
				sentinelElement.scrollIntoView({
					behavior: "smooth",
					block: "start",
					inline: "start",
				});
			}
		}, []);

		useEffect(() => {
			sentinelScroll(activeCanvasId);
		}, [sentinelScroll, activeCanvasId]);

		return (
			<div
				className={cn(
					"flex items-center gap-1 h-header pb-0.5 px-1 bg-background w-full justify-between  border-b border-sidebar-border",
				)}
			>
				<div
					className="flex-1"
					style={{
						width: `calc(100% - ${headerActionsWidth}px - 0.25rem)`,
					}}
				>
					<ScrollArea
						ref={scrollRef}
						className="w-full p-0 h-[calc(var(--header-height)-(var(--spacing)*0.5))]"
					>
						{/* <TabsList className="flex items-center bg-transparent h-[calc(var(--header-height)-(var(--spacing)*0.5))]"> */}
						<div className="flex w-fit items-center h-[calc(var(--header-height)-(var(--spacing)*0.5))]">
							{canvasTabs?.map((trigger) => (
								<CanvasTabTrigger
									key={trigger.id}
									canvas={trigger}
									isActive={activeCanvasId === trigger.id}
								/>
							))}
						</div>
						{/* </TabsList> */}
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				</div>

				<div ref={headerActionsRef} className="h-7 flex gap-0.5">
					{isLearningRoute && (
						<Button
							variant="ghost"
							size="icon"
							className="cursor-pointer rounded-md size-7"
						>
							<SharedIcon icon={Add01Icon} className="size-5" />
						</Button>
					)}

					{!isIndexRoute && (
						<CanvasTabTriggerWithActiveState value="list" asChild>
							<Button
								variant="ghost"
								size="icon"
								className="cursor-pointer rounded-md size-7"
							>
								<SharedIcon
									icon={isLearningRoute ? Clock02Icon : GridIcon}
									className="size-5"
								/>
							</Button>
						</CanvasTabTriggerWithActiveState>
					)}

					{isListActive ? (
						<Button
							variant="ghost"
							size="icon"
							className="cursor-pointer rounded-md size-7"
							onClick={() => {
								setOpenCanvas(roomId, false);
							}}
						>
							<SharedIcon icon={Cancel01Icon} className="size-5" />
						</Button>
					) : (
						<DropdownMenu
							modal={false}
							open={dropdownOpen}
							onOpenChange={setDropdownOpen}
						>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="cursor-pointer rounded-md size-7"
								>
									<SharedIcon icon={MoreHorizontalIcon} className="size-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="bottom"
								align="end"
								className="rounded-tmedium duration-75"
							>
								<DropdownMenuItem
									className="cursor-pointer p-2.5 rounded-xl"
									onSelect={(e) => {
										e.preventDefault();
										const { threadId } = activeCanvas?.data ?? {};
										const type = activeCanvas?.type;
										if (!threadId || !type) return;

										setDropdownOpen(false);
										// Wait for dropdown close animation before removing canvas
										setTimeout(() => {
											removeCanvas({
												roomId,
												threadId,
												type,
											});
										}, 100);
									}}
								>
									<span>Close Chat</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									className="cursor-pointer p-2.5 rounded-xl"
									onSelect={(e) => {
										e.preventDefault();
										if (!activeCanvas) return;
										setDropdownOpen(false);
										setTimeout(() => {
											clearCanvas(roomId);
										}, 100);
									}}
								>
									<span>Close All Chats</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									className="cursor-pointer p-2.5 rounded-xl"
									onSelect={(e) => {
										e.preventDefault();
										if (!activeCanvas) return;
										setDropdownOpen(false);
										setTimeout(() => {
											clearOtherCanvas(roomId);
										}, 100);
									}}
								>
									<span>Close Other Chats</span>
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem
									className="cursor-pointer p-2.5 rounded-xl"
									onSelect={() => {}}
								>
									<span>Open Chat in Main Thread</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
		);
	},
);

const AiCanvasTabListContent = memo(() => {
	const params = useParams({
		structuralSharing: true,
		strict: false,
	});
	const matchRoute = useMatchRoute();

	const learningId = params?.learningId ?? "";
	const chatId = params?.chatId ?? "";

	const currentLearningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const pendingLearningRoute = matchRoute({
		to: "/l/{-$learningId}",
		pending: true,
	});
	const currentChatRoute = matchRoute({ to: "/c/{-$chatId}" });
	const pendingChatRoute = matchRoute({
		to: "/c/{-$chatId}",
		pending: true,
	});
	const currentLearningChatRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningChatRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentLearningRoute = currentLearningRoute !== false;
	const isPendingLearningRoute = pendingLearningRoute !== false;
	const isCurrentChatRoute = currentChatRoute !== false;
	const isPendingChatRoute = pendingChatRoute !== false;
	const isCurrentLearningChatRoute = currentLearningChatRoute !== false;
	const isPendingLearningChatRoute = pendingLearningChatRoute !== false;

	const isChatRoute = isCurrentChatRoute || isPendingChatRoute;
	const isLearningChatRoute =
		isCurrentLearningChatRoute || isPendingLearningChatRoute;
	const isLearningRoute =
		!(isLearningChatRoute || isChatRoute) &&
		(isCurrentLearningRoute || isPendingLearningRoute);

	const { upsertCanvas } = useCanvasStore(
		useShallow(({ upsertCanvas }) => ({
			upsertCanvas,
		})),
	);

	const { userId } = useAuth();

	const { results: learningChatPanelByRoomId } = useConvexPaginatedQuery(
		api.learning.queries.getLearningsChatPanelsByRoomId,
		isLearningRoute && !!learningId
			? {
					userId,
					uuid: learningId,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	const { results: discussionListByRoomId } = useConvexPaginatedQuery(
		api.discussion.queries.getDiscussionsByRoomId,
		isChatRoute && !!chatId
			? {
					userId,
					uuid: chatId,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	const handleOpenListItem = useCallback(
		({
			type,
			data,
		}: { type: CanvasType; data: { threadId: string; roomId: string } }) => {
			upsertCanvas({
				type,
				data: {
					roomId: data.roomId,
					threadId: data.threadId,
				},
			});
		},
		[upsertCanvas],
	);

	return (
		<TabsContent value="list" className="w-full px-1">
			<div className="flex flex-col gap-1 py-1 h-svh sm:h-full">
				{isLearningRoute &&
					learningChatPanelByRoomId?.map((learning) => (
						<Button
							key={learning?._id ?? ""}
							variant="ghost"
							className="w-full rounded-tmedium px-2.5 cursor-pointer flex gap-1.5 justify-start"
							onClick={() => {
								if (!learningId) return;
								handleOpenListItem({
									type: CanvasType.LEARNING_CREATION,
									data: {
										threadId: learning?.data?.threadId ?? "",
										roomId: learningId,
									},
								});
							}}
						>
							<SharedIcon icon={TaskDaily02Icon} className="size-3.5" />
							<span className="text-sm font-normal truncate">
								{learning?.title}
							</span>
						</Button>
					))}

				{isChatRoute &&
					discussionListByRoomId?.map((discussion) => (
						<Button
							key={discussion?._id ?? ""}
							variant="ghost"
							className="w-full rounded-tmedium px-2.5 cursor-pointer flex gap-1.5 justify-start"
							onClick={() => {
								if (!chatId) return;
								handleOpenListItem({
									type: CanvasType.THREAD,
									data: {
										threadId: discussion?.data?.threadId ?? "",
										roomId: chatId,
									},
								});
							}}
						>
							<SharedIcon icon={TaskDaily02Icon} className="size-3.5" />
							<span className="text-sm font-normal truncate">
								{discussion?.title}
							</span>
						</Button>
					))}
			</div>
		</TabsContent>
	);
});

const AiCanvas = () => {
	const roomId = useGetRoomId();
	const canvasList = useCanvasList();
	const activeCanvasId = useActiveCanvasId();
	const openCanvas = useCanvasOpenStatus();

	const { setActiveCanvasId } = useCanvasStore(
		useShallow(({ setActiveCanvasId }) => ({
			setActiveCanvasId,
		})),
	);

	const typeMap = {
		[CanvasType.CONTENT]: { icon: File01Icon },
		[CanvasType.THREAD]: { icon: undefined },
		[CanvasType.LEARNING_CREATION]: { icon: undefined },
	};

	const componentMapper = (payload: CanvasPayload) => {
		const { type, data } = payload;
		switch (type) {
			case CanvasType.CONTENT:
				return (
					<ContainerWithMargin>
						<ContainerWithMaxWidth className="w-full">
							<Response>{MATH_MARKDOWN}</Response>
						</ContainerWithMaxWidth>
					</ContainerWithMargin>
				);

			case CanvasType.LEARNING_CREATION:
				return (
					<Suspense fallback={<AiConversationSkeleton />}>
						<AiConversation
							additionalThreadId={data?.threadId ?? ""}
							type="plan"
						/>
					</Suspense>
				);

			case CanvasType.THREAD:
				return (
					<Suspense fallback={<AiConversationSkeleton />}>
						<AiConversation
							additionalThreadId={data?.threadId ?? ""}
							type="discussion"
						/>
					</Suspense>
				);
			default:
				return null;
		}
	};

	const canvasTabs = canvasList.map((canvas) => {
		return {
			...canvas,
			icon: typeMap[canvas.type]?.icon,
			title: canvas?.data?.title,
			component: componentMapper(canvas),
		};
	});

	return (
		<Tabs
			value={activeCanvasId}
			onValueChange={(value) => setActiveCanvasId(roomId, value)}
			className="gap-0"
		>
			<TabsList className="flex items-center bg-transparent h-header w-full">
				<AiCanvasHeader canvasTabs={canvasTabs} />
			</TabsList>

			<AiCanvasTabListContent />

			{canvasTabs.map((canvas) => (
				<TabsContent key={canvas.id} value={canvas.id}>
					<div className={cn(!openCanvas && "hidden")}>{canvas.component}</div>
				</TabsContent>
			))}
		</Tabs>
	);
};

export default AiCanvas;
