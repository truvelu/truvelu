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
import type { agentTypeValidator, streamSectionValidator } from "convex/schema";
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
import { Spinner } from "../ui/spinner";
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

	const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const { data: chat } = useQuery(
		convexQuery(
			api.chat.getChat,
			!!user && !!roomId
				? {
						userId: user._id,
						uuid: roomId,
					}
				: "skip",
		),
	);
	const { data: chatByThreadId } = useQuery(
		convexQuery(
			api.chat.getChatByThreadIdAndUserId,
			!!user?._id?.toString() && !!additionalThreadId
				? {
						userId: user?._id?.toString() ?? "",
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

	const isIndexRoute =
		(currentIndexRoute !== false || pendingIndexRoute !== false) && !roomId;
	const isCurrentLearningRoute = currentlearningRoute !== false;
	const isPendingLearningRoute = pendingLearningRoute !== false;
	const isLearningRoute = isCurrentLearningRoute || isPendingLearningRoute;

	const {
		results: messages,
		status,
		loadMore,
	} = useUIMessages(
		api.chat.listThreadMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 10, stream: true },
	);

	const createChat = useMutation({
		mutationKey: ["createChat", roomId],
		mutationFn: useConvexMutation(api.chat.createChat),
	});
	const sendChatMessage = useMutation({
		mutationKey: ["sendChatMessage", threadId],
		mutationFn: useConvexMutation(
			api.chat.sendChatMessage,
		).withOptimisticUpdate(
			optimisticallySendMessage(api.chat.listThreadMessages),
		),
	});
	const abortStreamByOrder = useMutation({
		mutationKey: ["abortStreamByOrder", threadId],
		mutationFn: useConvexMutation(api.chat.abortStreamByOrder),
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

	const messageThatIsStreaming = useMemo(
		() => messages.find((message) => message?.status === "streaming"),
		[messages],
	);
	const messageOrderThatIsStreaming = useMemo(
		() => messageThatIsStreaming?.order ?? 0,
		[messageThatIsStreaming],
	);
	const isInputStatusLoading = useMemo(
		() => roomStatus === "streaming" || !!messageThatIsStreaming,
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

	const handleSubmitNewChat = useCallback(
		async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			const userId = user?._id?.toString();

			if (!userId) return;

			const prompt = message.text ?? "";
			createChat.mutate(
				{
					agentType: "learning-generation",
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
							agentType: "course-planner",
							userId,
						});
					},
				},
			);
			event.preventDefault();
		},
		[user?._id, createChat, sendChatMessage, navigate],
	);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
			const userId = user?._id?.toString();

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

			const MAPPING: {
				[key: string]: {
					agentType: Infer<typeof agentTypeValidator>;
					type: "learning" | "ask";
				};
			} = {
				"learning-creation": {
					agentType: "course-planner",
					type: "learning",
				},
				thread: {
					agentType: "question-answering",
					type: "ask",
				},
				discussion: {
					agentType: "question-answering",
					type: "ask",
				},
			};

			sendChatMessage.mutate({
				threadId,
				roomId,
				prompt: message.text ?? "",
				agentType: MAPPING[type]?.agentType ?? "question-answering",
				type: MAPPING[type]?.type ?? "ask",
				userId,
			});
			scrollToBottom();
			event.preventDefault();
		},
		[
			threadId,
			user?._id,
			roomId,
			sendChatMessage,
			abortStreamByOrder,
			messageOrderThatIsStreaming,
			isIndexRoute,
			scrollToBottom,
			handleSubmitNewChat,
			isInputStatusLoading,
			type,
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
		if (!user) return;
		if (chat !== null) return;

		navigate({ to: "/" });

		toast.error("Chat not found");
	}, [chat, navigate, user, isIndexRoute, isLearningRoute]);

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
						{(isIndexRoute || status !== "LoadingFirstPage") &&
						!messages?.length ? (
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
								{messages.map((message, index, messageArray) => {
									return (
										<Fragment key={`${message.id}`}>
											<AiMessages message={message} type={type} />
											{roomStatus === "streaming" &&
												!messageThatIsStreamingTextPartHasValue &&
												messageArray.length - 1 === index && (
													<div className="flex items-center justify-start flex-1 h-9 px-4">
														<div className="size-4 rounded-full bg-gray-400 animate-ping" />
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

			<div ref={inputRef} className={cn("absolute inset-x-0 bottom-0 mx-4")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth className={cn("pb-2 flex-1")}>
						<AiPromptInput
							onSubmit={handleSubmit}
							isInputStatusLoading={isInputStatusLoading}
						/>
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</>
	);
});

const AiConversation = memo(
	({ type = "thread", ...props }: AiConversationProps) => {
		const roomId = useGetRoomId();

		const isMainThread = type === "thread";

		return (
			<Conversation
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
