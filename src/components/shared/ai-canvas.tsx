import { MATH_MARKDOWN } from "@/constants/messages";
import { useCanvasList } from "@/hooks/use-canvas";
import { useEditableTitle } from "@/hooks/use-editable-title";
import { useGetComponentSize } from "@/hooks/use-get-component-size";
import { cn } from "@/lib/utils";
import {
	type CanvasPayload,
	CanvasType,
	useCanvasStore,
} from "@/zustand/canvas";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import {
	Add01Icon,
	Cancel01Icon,
	Clock02Icon,
	Delete02Icon,
	Edit03Icon,
	File01Icon,
	GridIcon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatchRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { Response } from "../ai-elements/response";
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
import AiConversation from "./ai-conversation";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

interface CanvasTabTriggerProps {
	canvas: CanvasPayload & { icon?: typeof File01Icon; title?: string };
	isActive: boolean;
	canvasArray: (CanvasPayload & { icon?: typeof File01Icon; title?: string })[];
}

const AiCanvasHeader = memo(({ children }: { children: React.ReactNode }) => {
	const matchRoute = useMatchRoute();
	const learningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const isLearningRoute = learningRoute !== false;

	const { ref: headerActionsRef, width: headerActionsWidth } =
		useGetComponentSize<HTMLDivElement>();

	return (
		<div
			className={cn(
				"flex items-center gap-1 h-header pb-0.5 px-1 bg-white w-full justify-between  border-b border-sidebar-border",
			)}
		>
			<div
				className="flex-1"
				style={{
					width: `calc(100% - ${headerActionsWidth}px)`,
				}}
			>
				{children}
			</div>

			<div ref={headerActionsRef} className="h-7 flex gap-0.5">
				{isLearningRoute && (
					<>
						<Button
							variant="ghost"
							size="icon"
							className="cursor-pointer rounded-md size-7"
						>
							<SharedIcon icon={Add01Icon} className="size-4" />
						</Button>

						<Button
							variant="ghost"
							size="icon"
							className="cursor-pointer rounded-md size-7"
						>
							<SharedIcon icon={Clock02Icon} className="size-3.5" />
						</Button>
					</>
				)}

				<Button
					variant="ghost"
					size="icon"
					className="cursor-pointer rounded-md size-7"
				>
					<SharedIcon icon={MoreHorizontalIcon} className="size-4" />
				</Button>
			</div>
		</div>
	);
});

const CanvasTabTrigger = memo(
	({ canvas, isActive, canvasArray }: CanvasTabTriggerProps) => {
		const { upsertCanvas, removeCanvas, setActiveCanvasId } = useCanvasStore(
			useShallow(({ upsertCanvas, removeCanvas, setActiveCanvasId }) => ({
				upsertCanvas,
				removeCanvas,
				setActiveCanvasId,
			})),
		);

		const updateChatTitle = useAction(api.chatAction.updateChatTitle);
		const deleteDiscussion = useMutation({
			mutationKey: ["deleteDiscussion"],
			mutationFn: useConvexMutation(api.discussion.deleteDiscussion),
		});

		const threadId = canvas?.data?.threadId ?? "";
		const roomId = canvas?.data?.roomId ?? "";

		const { data: chatDiscussionMetadata } = useQuery(
			convexQuery(api.chat.getMetadata, threadId ? { threadId } : "skip"),
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

			if (canvasArray.length) {
				setActiveCanvasId(canvasArray[0]?.id ?? "");
			}
		}, [
			canvas.type,
			threadId,
			roomId,
			canvasArray,
			removeCanvas,
			setActiveCanvasId,
		]);

		useEffect(() => {
			if (!chatDiscussionMetadata?.title) return;
			if (chatDiscussionMetadata?.title === canvas?.data?.title) return;
			upsertCanvas({
				id: canvas.id,
				type: CanvasType.THREAD,
				data: {
					title: chatDiscussionMetadata?.title ?? "",
					threadId,
					roomId,
				},
			});
		}, [
			chatDiscussionMetadata?.title,
			threadId,
			roomId,
			canvas.id,
			canvas?.data?.title,
			upsertCanvas,
		]);

		return (
			<>
				<div data-tab-id={canvas.id} className="relative">
					<TabsTrigger
						value={canvas.id}
						className={cn(
							"cursor-pointer data-[state=active]:border data-[state=active]:border-sidebar-border !shadow-none",
							"pl-1.5 rounded-tlarge gap-0.5 h-7 py-0",
							!isActive ? "pr-4" : "pr-7",
						)}
					>
						{canvas.icon ? (
							<SharedIcon icon={canvas.icon} />
						) : (
							<>
								<div className="size-5 flex items-center justify-center">
									<SharedIcon icon={GridIcon} className="size-3.5" />
								</div>

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
					</TabsTrigger>

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
								onClick={() => {
									if (!threadId) return;
									deleteDiscussion.mutate(
										{ threadId },
										{
											onSuccess: () => {
												handleRemoveCanvas();
											},
										},
									);
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
	},
);

const AiCanvas = () => {
	const canvasList = useCanvasList();
	const { activeCanvasId, setActiveCanvasId } = useCanvasStore(
		useShallow(({ activeCanvasId, setActiveCanvasId }) => ({
			activeCanvasId,
			setActiveCanvasId,
		})),
	);

	const scrollRef = useRef<HTMLDivElement>(null);

	const typeMap = {
		[CanvasType.CONTENT]: { icon: File01Icon },
		[CanvasType.THREAD]: { icon: undefined },
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
			case CanvasType.THREAD:
				return (
					<AiConversation
						additionalThreadId={data?.threadId ?? ""}
						type="discussion"
					/>
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

	const lastCanvas = canvasList[canvasList.length - 1];

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
		setActiveCanvasId(lastCanvas?.id);
	}, [lastCanvas, setActiveCanvasId]);

	useEffect(() => {
		sentinelScroll(activeCanvasId);
	}, [sentinelScroll, activeCanvasId]);

	return (
		<Tabs
			value={activeCanvasId}
			onValueChange={setActiveCanvasId}
			className="gap-0"
		>
			<AiCanvasHeader>
				<ScrollArea
					ref={scrollRef}
					className="w-full p-0 h-[calc(var(--header-height)-(var(--spacing)*0.5))]"
				>
					<TabsList className="flex items-center bg-transparent h-[calc(var(--header-height)-(var(--spacing)*0.5))]">
						{canvasTabs?.map((trigger) => (
							<CanvasTabTrigger
								key={trigger.id}
								canvas={trigger}
								isActive={activeCanvasId === trigger.id}
								canvasArray={canvasTabs}
							/>
						))}
					</TabsList>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
			</AiCanvasHeader>
			{canvasTabs.map((canvas) => (
				<TabsContent key={canvas.id} value={canvas.id}>
					<div>{canvas.component}</div>
				</TabsContent>
			))}
		</Tabs>
	);
};

export default AiCanvas;
