import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import { type CanvasType, useCanvasStore } from "@/zustand/canvas";
import {
	optimisticallySendMessage,
	useUIMessages,
} from "@convex-dev/agent/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import {
	type FormEvent,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useShallow } from "zustand/react/shallow";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import type { PromptInputMessage } from "../ai-elements/prompt-input";
import { useSidebar } from "../ui/sidebar";
import { Spinner } from "../ui/spinner";
import AiMessages from "./ai-messages";
import { AiPromptInput } from "./ai-prompt-input";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

const AiConversationContent = memo(() => {
	const matchRoute = useMatchRoute();
	const isIndexRoute = matchRoute({ to: "/", pending: true });
	const isLearningRoute = matchRoute({
		to: "/l/{-$learningId}",
		pending: true,
	});
	const navigate = useNavigate();
	const roomId = useGetRoomId();
	const {
		open: sidebarOpen,
		setOpen: setSidebarOpen,
		setOpenMobile: setSidebarOpenMobile,
	} = useSidebar();
	const { upsertCanvas, getCanvas, removeCanvas } = useCanvasStore(
		useShallow(({ upsertCanvas, getCanvas, removeCanvas }) => ({
			upsertCanvas,
			getCanvas,
			removeCanvas,
		})),
	);
	const { isIntersecting, ref } = useIntersectionObserver({
		threshold: 0.5,
	});
	const { isAtBottom, scrollRef, scrollToBottom } = useStickToBottomContext();

	const prevRoomIdRef = useRef<string | null>(null);
	const sentinelMessageIdRef = useRef<string | null>(null);
	const isLoadingMoreRef = useRef(false);
	const prevMessagesLengthRef = useRef<number>(0);
	const inputRef = useRef<HTMLDivElement>(null);

	const [isReadyToShow, setIsReadyToShow] = useState(false);
	const [inputHeight, setInputHeight] = useState(0);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const { data: chat, isLoading: isChatLoading } = useQuery(
		convexQuery(
			api.chat.getChat,
			!!user?._id?.toString() && !!roomId
				? {
						userId: user?._id?.toString() ?? "",
						uuid: roomId,
					}
				: "skip",
		),
	);
	const {
		results: messages,
		status,
		loadMore,
	} = useUIMessages(
		api.chat.listThreadMessages,
		chat?.threadId ? { threadId: chat?.threadId ?? "" } : "skip",
		{ initialNumItems: 20, stream: true },
	);
	const sendChatMessage = useMutation({
		mutationKey: ["sendChatMessage"],
		mutationFn: useConvexMutation(
			api.chat.sendChatMessage,
		).withOptimisticUpdate(
			optimisticallySendMessage(api.chat.listThreadMessages),
		),
	});
	const abortStreamByOrder = useMutation({
		mutationKey: ["abortStreamByOrder"],
		mutationFn: useConvexMutation(api.chat.abortStreamByOrder),
	});

	const messageThatIsStreaming = useMemo(
		() => messages.find((message) => message?.status === "streaming"),
		[messages],
	);
	const messageOrderThatIsStreaming = useMemo(
		() => messageThatIsStreaming?.order ?? 0,
		[messageThatIsStreaming],
	);
	const isMessageStatusStreaming = useMemo(
		() => !!messageThatIsStreaming,
		[messageThatIsStreaming],
	);
	const isMessageStatusPending = useMemo(
		() => !!messages.find((message) => message?.status === "pending"),
		[messages],
	);
	const isInputStatusLoading = useMemo(
		() => isMessageStatusStreaming || isMessageStatusPending || isSubmitted,
		[isMessageStatusStreaming, isMessageStatusPending, isSubmitted],
	);

	const handleInputReady = useCallback(() => {
		if (inputRef.current) {
			setInputHeight(inputRef.current.offsetHeight);
		}
	}, []);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			if (!chat?.threadId || !user?._id?.toString() || !roomId) return;
			if (isMessageStatusStreaming) {
				abortStreamByOrder.mutate({
					threadId: chat?.threadId ?? "",
					order: messageOrderThatIsStreaming,
				});
				return;
			}

			sendChatMessage.mutate(
				{
					threadId: chat?.threadId ?? "",
					roomId: roomId,
					prompt: message.text ?? "",
					modelKey: "minimax/minimax-m2:free",
					userId: user?._id?.toString() ?? "",
				},
				{
					onSettled: () => {
						setIsSubmitted(true);
					},
				},
			);
			scrollToBottom();
			event.preventDefault();
		},
		[
			chat?.threadId,
			user?._id,
			roomId,
			sendChatMessage,
			scrollToBottom,
			abortStreamByOrder,
			messageOrderThatIsStreaming,
			isMessageStatusStreaming,
		],
	);

	const handleOpenCanvas = useCallback(
		({
			type,
			threadId,
		}: {
			type: CanvasType;
			threadId: string;
		}) => {
			const existingCanvas = getCanvas({
				roomId,
				threadId,
				type,
			});

			if (existingCanvas.length > 0) {
				removeCanvas({
					type,
					roomId,
					threadId,
				});
			} else {
				upsertCanvas({
					type,
					data: { threadId, roomId },
				});
			}

			if (existingCanvas.length > 0 && sidebarOpen) return;
			setSidebarOpen(false);
			setSidebarOpenMobile(false);
		},
		[
			roomId,
			getCanvas,
			removeCanvas,
			upsertCanvas,
			sidebarOpen,
			setSidebarOpen,
			setSidebarOpenMobile,
		],
	);

	// Reset state when roomId changes
	useEffect(() => {
		if (prevRoomIdRef.current !== roomId) {
			setIsReadyToShow(false);
			prevRoomIdRef.current = roomId;
		}
	}, [roomId]);

	// Handle input height tracking
	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;

		const updateHeight = () => {
			setInputHeight(input.offsetHeight);
		};

		const ro = new ResizeObserver(updateHeight);
		ro.observe(input);

		window.addEventListener("resize", updateHeight);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", updateHeight);
		};
	}, []);

	// Wait for scroll to reach bottom before showing messages
	useEffect(() => {
		if (isReadyToShow) return;
		if (status === "LoadingFirstPage") return;
		if (!isAtBottom) return;

		// Use RAF + timeout for reliable visual completion
		let rafId: number;
		let timerId: NodeJS.Timeout;

		rafId = requestAnimationFrame(() => {
			rafId = requestAnimationFrame(() => {
				// Add small timeout to ensure scroll paint is complete
				timerId = setTimeout(() => {
					setIsReadyToShow(true);
				}, 50);
			});
		});

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (timerId) clearTimeout(timerId);
		};
	}, [isAtBottom, status, isReadyToShow]);

	// Track messages length and preserve scroll position using sentinel element
	useLayoutEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		// If loading more and messages increased
		if (
			isLoadingMoreRef.current &&
			messages.length > prevMessagesLengthRef.current &&
			sentinelMessageIdRef.current
		) {
			// Find the sentinel element (the message we want to keep in view)
			const sentinelElement = container.querySelector(
				`[data-message-id="${sentinelMessageIdRef.current}"]`,
			);

			if (sentinelElement) {
				// Scroll to maintain the sentinel element's position
				sentinelElement.scrollIntoView({ block: "start" });
			}

			isLoadingMoreRef.current = false;
			sentinelMessageIdRef.current = null;
		}

		prevMessagesLengthRef.current = messages.length;
	}, [messages.length, scrollRef]);

	// Load more messages when scrolling to top (with debounce)
	useEffect(() => {
		if (!isReadyToShow) return;
		if (status !== "CanLoadMore") return;
		if (!isIntersecting) return;
		if (isLoadingMoreRef.current) return;

		const container = scrollRef.current;
		if (!container) return;

		// Debounce to prevent aggressive loading on scroll
		const timer = setTimeout(() => {
			if (!scrollRef.current) return;

			// Find the first currently visible message to use as sentinel
			const firstVisibleMessage = messages[0];
			if (firstVisibleMessage) {
				sentinelMessageIdRef.current = firstVisibleMessage.id;
			}

			isLoadingMoreRef.current = true;
			loadMore(20);
		}, 150);

		return () => clearTimeout(timer);
	}, [isIntersecting, status, isReadyToShow, loadMore, scrollRef, messages]);

	useEffect(() => {
		if (isIndexRoute || isLearningRoute) return;
		if (!user?._id?.toString() || !roomId) return;
		if (!chat && !isChatLoading) {
			navigate({
				to: "/",
			})
				.then(() => {
					toast.error("Chat not found");
				})
				.catch(() => {
					toast.error("Failed to navigate to home");
				});
		}
	}, [
		chat,
		navigate,
		user?._id,
		roomId,
		isChatLoading,
		isIndexRoute,
		isLearningRoute,
	]);

	useEffect(() => {
		if (isMessageStatusStreaming) {
			setIsSubmitted(false);
		}
	}, [isMessageStatusStreaming]);

	return (
		<>
			<ConversationContent className="px-0" key={roomId}>
				<ContainerWithMargin
					asContent
					style={{
						paddingBottom: `calc(${inputHeight}px + 0.5rem + env(safe-area-inset-bottom) + 8rem)`,
					}}
				>
					<ContainerWithMaxWidth className="w-full">
						{status !== "LoadingFirstPage" && !messages.length ? (
							// Show empty state when no messages and not loading
							<ConversationEmptyState
								icon={<SharedIcon icon={Message01Icon} size={48} />}
								title="Start a conversation"
								description="Type a message below to begin chatting"
							/>
						) : (
							// Render messages but hide them until scroll is complete
							<div className={cn(!isReadyToShow && "invisible")}>
								{(status === "CanLoadMore" || status === "LoadingMore") &&
									isReadyToShow && (
										<div
											ref={ref}
											className="flex items-center justify-center flex-1 h-12"
										>
											<div className="rounded-tlarge px-2.5 py-1.5 flex items-center gap-1 outline-1 outline-gray-400">
												<Spinner />
												<span className="text-sm text-gray-600">
													Loading more
												</span>
											</div>
										</div>
									)}
								{messages.map((message) => {
									return (
										<AiMessages
											key={`${message.id}`}
											message={message}
											handleOpenCanvas={handleOpenCanvas}
										/>
									);
								})}
							</div>
						)}
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</ConversationContent>

			<ConversationScrollButton
				style={{
					bottom: `calc(${inputHeight}px + 1.5rem)`,
				}}
			/>

			<div ref={inputRef} className={cn("absolute inset-x-0 bottom-0")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth className={cn("pb-2 bg-white flex-1")}>
						<AiPromptInput
							onReady={handleInputReady}
							onSubmit={handleSubmit}
							isInputStatusLoading={isInputStatusLoading}
						/>
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</>
	);
});

const AiConversation = memo(() => {
	const roomId = useGetRoomId();
	return (
		<Conversation
			key={roomId}
			className={cn(
				"relative h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))] flex-1",
				"[&>div]:[scrollbar-gutter:stable_both-edges]",
			)}
		>
			<AiConversationContent />
		</Conversation>
	);
});

AiConversation.displayName = "AiConversation";

export default AiConversation;
