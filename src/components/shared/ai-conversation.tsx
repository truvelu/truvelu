import { MessageType } from "@/constants/messages";
import { useGetComponentSize } from "@/hooks/use-get-component-size";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import {
	optimisticallySendMessage,
	useUIMessages,
} from "@convex-dev/agent/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import type { ToolUIPart } from "ai";
import { api } from "convex/_generated/api";
import type { streamSectionValidator } from "convex/schema";
import type { Infer } from "convex/values";
import {
	type FormEvent,
	Fragment,
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
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import type { PromptInputMessage } from "../ai-elements/prompt-input";
import { Shimmer } from "../ai-elements/shimmer";
import { useAuth } from "../provider/auth-provider";
import { Spinner } from "../ui/spinner";
import { AiLearningPreferenceInput } from "./ai-learning-preference-input";
import AiMessages from "./ai-messages";
import { AiPromptInput } from "./ai-prompt-input";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

interface AiConversationProps {
	additionalThreadId?: string;
	type?: Infer<typeof streamSectionValidator>;
}

const AiConversationContent = memo((props: AiConversationProps) => {
	const { additionalThreadId, type = "thread" } = props;

	const { userId } = useAuth();
	const matchRoute = useMatchRoute();
	const navigate = useNavigate();
	const roomId = useGetRoomId();
	const { isIntersecting, ref } = useIntersectionObserver({
		threshold: 0.5,
	});
	const { isAtBottom, scrollRef, scrollToBottom } = useStickToBottomContext();

	const prevRoomIdRef = useRef<string | null>(null);
	const sentinelMessageIdRef = useRef<string | null>(null);
	const isLoadingMoreRef = useRef(false);
	const prevMessagesLengthRef = useRef<number>(0);

	const [isReadyToShow, setIsReadyToShow] = useState(false);

	const { ref: inputRef, height: inputHeight } =
		useGetComponentSize<HTMLDivElement>();

	const { data: chat } = useQuery(
		convexQuery(
			api.chat.queries.getChat,
			userId
				? {
						userId,
						uuid: roomId,
					}
				: "skip",
		),
	);
	const { data: chatByThreadId } = useQuery(
		convexQuery(
			api.chat.queries.getChatByThreadIdAndUserId,
			additionalThreadId
				? {
						userId,
						threadId: additionalThreadId,
					}
				: "skip",
		),
	);

	const threadId = additionalThreadId ?? chat?.threadId ?? "";
	const isMainThread = type === "thread";

	const currentIndexRoute = matchRoute({ to: "/" });
	const pendingIndexRoute = matchRoute({ to: "/", pending: true });
	const currentlearningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const pendingLearningRoute = matchRoute({
		to: "/l/{-$learningId}",
		pending: true,
	});
	const currentLearningCreationRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningCreationRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentIndexRoute = currentIndexRoute !== false;
	const isPendingIndexRoute = pendingIndexRoute !== false;
	const isCurrentLearningRoute = currentlearningRoute !== false;
	const isPendingLearningRoute = pendingLearningRoute !== false;
	const isCurrentLearningCreationRoute = currentLearningCreationRoute !== false;
	const isPendingLearningCreationRoute = pendingLearningCreationRoute !== false;

	const isIndexRoute = (isCurrentIndexRoute || isPendingIndexRoute) && !roomId;
	const isLearningRoute = isCurrentLearningRoute || isPendingLearningRoute;
	const isLearningCreationRoute =
		isCurrentLearningCreationRoute || isPendingLearningCreationRoute;

	const { data: hasLearningChatMetadataContent } = useQuery(
		convexQuery(
			api.learningChatMetadata.queries.hasLearningChatMetadataContent,
			isLearningRoute && !!roomId
				? {
						userId,
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
		api.chat.queries.listThreadMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 10, stream: true },
	);

	const { data: lastPlan } = useQuery(
		convexQuery(
			api.plan.queries.getLastPlanByThreadId,
			type === "learning-creation" && threadId
				? {
						threadId,
						userId,
					}
				: "skip",
		),
	);

	const createChat = useMutation({
		mutationKey: ["createChat", roomId],
		mutationFn: useConvexMutation(api.chat.mutations.createChat),
	});
	const sendChatMessage = useMutation({
		mutationKey: ["sendChatMessage", threadId],
		mutationFn: useConvexMutation(
			api.chat.mutations.sendChatMessage,
		).withOptimisticUpdate(
			optimisticallySendMessage(api.chat.queries.listThreadMessages),
		),
	});
	const abortStreamByOrder = useMutation({
		mutationKey: ["abortStreamByOrder", threadId],
		mutationFn: useConvexMutation(api.chat.mutations.abortStreamByOrder),
	});

	const chatStatus = useMemo(() => chat?.status ?? "ready", [chat]);
	const discussionStatus = useMemo(
		() => chatByThreadId?.status ?? "ready",
		[chatByThreadId],
	);

	const roomStatus = useMemo(
		() => (isMainThread ? chatStatus : discussionStatus),
		[isMainThread, discussionStatus, chatStatus],
	);

	const chatStatusMessage = useMemo(
		() => chat?.statusMessage ?? "",
		[chat?.statusMessage],
	);
	const discussionStatusMessage = useMemo(
		() => chatByThreadId?.statusMessage ?? "",
		[chatByThreadId?.statusMessage],
	);
	const roomStatusMessage = useMemo(
		() => (isMainThread ? chatStatusMessage : discussionStatusMessage),
		[isMainThread, chatStatusMessage, discussionStatusMessage],
	);

	const messageThatIsStreaming = useMemo(
		() =>
			messages.find(
				(message) =>
					message?.status === "streaming" || message?.status === "pending",
			),
		[messages],
	);
	const messageOrderThatIsStreaming = useMemo(
		() => messageThatIsStreaming?.order ?? 0,
		[messageThatIsStreaming],
	);
	const isInputStatusLoading = useMemo(
		() =>
			roomStatus === "submitted" ||
			roomStatus === "streaming" ||
			!!messageThatIsStreaming,
		[roomStatus, messageThatIsStreaming],
	);
	const messageThatIsStreamingTextPartHasValue = useMemo(() => {
		const parts = messageThatIsStreaming?.parts ?? [];

		const textPart = parts.find((part) => part.type === MessageType.TEXT);
		const toolPart = parts.find((part) => part.type.startsWith("tool-")) as
			| ToolUIPart
			| undefined;
		const reasoningPart = parts.find((part) => part.type === "reasoning");

		const textPartHasValue = !!(textPart?.text && textPart.text.length > 0);
		const toolPartHasValue = !!toolPart?.output;
		const reasoningPartHasValue = !!(
			reasoningPart?.text && reasoningPart.text.length > 0
		);

		return textPartHasValue || toolPartHasValue || reasoningPartHasValue;
	}, [messageThatIsStreaming]);
	const learningCreationTypeAndHasNotLearningChatMetadataContent =
		useMemo(() => {
			return type === "learning-creation" && !hasLearningChatMetadataContent;
		}, [type, hasLearningChatMetadataContent]);

	const handleSubmitNewChat = useCallback(
		async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			if (!userId) return;

			const prompt = message.text ?? "";
			createChat.mutate(
				{
					type: "main",
					agentType: "question-answering",
					userId,
				},
				{
					onSuccess: ({ threadId, roomId }) => {
						navigate({
							to: "/c/{-$chatId}",
							params: {
								chatId: roomId.toString(),
							},
						});
						sendChatMessage.mutate({
							threadId,
							roomId,
							prompt,
							userId,
						});
					},
				},
			);
			event.preventDefault();
		},
		[userId, createChat, sendChatMessage, navigate],
	);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			if (!userId) return;

			// Only create new chat if on index route
			if (isIndexRoute) {
				await handleSubmitNewChat(message, event);
				return;
			}

			if (!threadId || !roomId) return;

			if (isInputStatusLoading) {
				abortStreamByOrder.mutate({
					threadId,
					order: messageOrderThatIsStreaming,
				});
				return;
			}

			sendChatMessage.mutate({
				threadId,
				roomId,
				prompt: message.text ?? "",
				type:
					type === "learning-creation" && lastPlan?.status !== "completed"
						? "agent"
						: "ask",
				userId,
			});
			scrollToBottom();
			event.preventDefault();
		},
		[
			threadId,
			userId,
			roomId,
			sendChatMessage,
			abortStreamByOrder,
			messageOrderThatIsStreaming,
			isIndexRoute,
			scrollToBottom,
			handleSubmitNewChat,
			isInputStatusLoading,
			type,
			lastPlan?.status,
		],
	);

	// Reset state when roomId changes
	useEffect(() => {
		if (prevRoomIdRef.current !== roomId) {
			setIsReadyToShow(false);
			prevRoomIdRef.current = roomId;
		}
	}, [roomId]);

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
				}, 0);
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
		if (!userId) return;
		if (chat !== null) return;

		navigate({ to: "/" });

		toast.error("Chat not found");
	}, [chat, navigate, userId, isIndexRoute, isLearningRoute]);

	return (
		<>
			<ConversationContent className="px-0" key={roomId}>
				<ContainerWithMargin
					asContent
					style={{
						paddingBottom: `calc(${inputHeight}px + 0.5rem + env(safe-area-inset-bottom) + 1rem)`,
					}}
				>
					<ContainerWithMaxWidth className="w-full">
						{isIndexRoute && !messages?.length ? (
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
												<span className="text-sm text-secondary-foreground/40">
													Loading more
												</span>
											</div>
										</div>
									)}
								{messages.map((message, index, messageArray) => {
									return (
										<Fragment key={`${message.id}`}>
											<AiMessages
												message={message}
												type={type}
												isInputStatusLoading={isInputStatusLoading}
											/>
											{roomStatus === "streaming" &&
												!messageThatIsStreamingTextPartHasValue &&
												messageArray.length - 1 === index && (
													<div className="flex items-center justify-start flex-1 h-9">
														{roomStatusMessage ? (
															<Shimmer duration={3} spread={3}>
																{roomStatusMessage}
															</Shimmer>
														) : (
															<div className="size-4 rounded-full bg-secondary-foreground/40 animate-ping" />
														)}
													</div>
												)}
										</Fragment>
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

			{!isLearningCreationRoute && (
				<div
					ref={inputRef}
					className={cn("absolute inset-x-0 bottom-0 mx-4 bg-background")}
				>
					<ContainerWithMargin>
						<ContainerWithMaxWidth className={cn("pt-1 pb-2 flex-1")}>
							{learningCreationTypeAndHasNotLearningChatMetadataContent ? (
								<AiLearningPreferenceInput threadId={threadId} />
							) : (
								<AiPromptInput
									type={type}
									onSubmit={handleSubmit}
									isInputStatusLoading={isInputStatusLoading}
								/>
							)}
						</ContainerWithMaxWidth>
					</ContainerWithMargin>
				</div>
			)}
		</>
	);
});

const AiConversation = memo(
	({ type = "thread", ...props }: AiConversationProps) => {
		const roomId = useGetRoomId();

		const isMainThread = type === "thread";

		return (
			<Conversation
				initial="instant"
				resize="instant"
				key={roomId}
				className={cn(
					"relative flex-1 sm:h-[calc(100lvh-var(--spacing-header))]",
					"[&>div]:[scrollbar-gutter:stable_both-edges]",
					isMainThread
						? "h-[calc(100svh-var(--spacing-header))]"
						: "h-[calc(95svh-var(--spacing-header)-1.5rem)]",
				)}
			>
				<AiConversationContent type={type} {...props} />
			</Conversation>
		);
	},
);

AiConversation.displayName = "AiConversation";

export default AiConversation;
