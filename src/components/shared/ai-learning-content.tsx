import { MessageType } from "@/constants/messages";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import { useUIMessages } from "@convex-dev/agent/react";
import {
	convexQuery,
	useConvexMutation,
	useConvexPaginatedQuery,
} from "@convex-dev/react-query";
import {
	ArrowLeft02Icon,
	ArrowRight02Icon,
	Message01Icon,
	StopIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatchRoute, useNavigate, useParams } from "@tanstack/react-router";
import type { ToolUIPart } from "ai";
import { api } from "convex/_generated/api";
import type {} from "convex/schema";
import { Fragment, memo, useCallback, useMemo } from "react";
import { Shimmer } from "../ai-elements/shimmer";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import AiMessages from "./ai-messages";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

const AiLearningContentResult = memo(() => {
	const matchRoute = useMatchRoute();
	const navigate = useNavigate();
	const params = useParams({ strict: false });

	const chatRoomId = params?.chatId;
	const learningId = params?.learningId;

	const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const { data: chat } = useQuery(
		convexQuery(
			api.chat.queries.getChat,
			!!user && !!chatRoomId
				? {
						userId: user._id,
						uuid: chatRoomId,
					}
				: "skip",
		),
	);

	const threadId = chat?.threadId ?? "";

	const currentLearningCreationRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
	});
	const pendingLearningCreationRoute = matchRoute({
		to: "/l/{-$learningId}/c/{-$chatId}",
		pending: true,
	});

	const isCurrentLearningCreationRoute = currentLearningCreationRoute !== false;
	const isPendingLearningCreationRoute = pendingLearningCreationRoute !== false;
	const isLearningCreationRoute =
		isCurrentLearningCreationRoute || isPendingLearningCreationRoute;

	const { results: messages, status } = useUIMessages(
		api.chat.queries.listThreadMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 10, stream: true },
	);

	const { results: learningChatsContent, isLoading } = useConvexPaginatedQuery(
		api.learning.queries.getLearningChatsContentByLearningRoomId,
		isLearningCreationRoute && user?._id?.toString() && learningId
			? {
					userId: user?._id?.toString() ?? "",
					uuid: learningId,
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	const currentLearningChatIndex = useMemo(() => {
		return (
			learningChatsContent?.findIndex(
				(learningChat) => learningChat?.chatData?._id === chat?._id,
			) ?? 0
		);
	}, [learningChatsContent, chat]);

	const abortStreamByOrder = useMutation({
		mutationKey: ["abortStreamByOrder", threadId],
		mutationFn: useConvexMutation(api.chat.mutations.abortStreamByOrder),
	});

	const chatStatus = useMemo(() => chat?.status ?? "ready", [chat]);

	const chatStatusMessage = useMemo(
		() => chat?.statusMessage ?? "",
		[chat?.statusMessage],
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
			chatStatus === "submitted" ||
			chatStatus === "streaming" ||
			!!messageThatIsStreaming,
		[chatStatus, messageThatIsStreaming],
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

	const handleAbortStreamByOrder = useCallback(() => {
		abortStreamByOrder.mutate({
			threadId,
			order: messageOrderThatIsStreaming,
		});
	}, [abortStreamByOrder, threadId, messageOrderThatIsStreaming]);

	return (
		<>
			<div
				className={cn(
					"flex-1 sm:h-[calc(100lvh-var(--spacing-header))] h-[calc(100svh-var(--spacing-header))] overflow-y-auto [scrollbar-gutter:stable_both-edges]",
				)}
				key={chatRoomId}
			>
				<ContainerWithMargin
					asContent
					style={{
						paddingTop: "3rem",
						paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom) + 1rem)",
					}}
				>
					<ContainerWithMaxWidth className="w-full">
						{status !== "LoadingFirstPage" && !messages?.length ? (
							// Show empty state when no messages and not loading
							<div
								className={cn(
									"flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
								)}
							>
								<SharedIcon icon={Message01Icon} size={48} />
								<div className="space-y-1">
									<h3 className="font-medium text-sm">Start a conversation</h3>
									<p className="text-muted-foreground text-sm">
										Type a message below to begin chatting
									</p>
								</div>
							</div>
						) : (
							// Render messages but hide them until scroll is complete
							<div>
								{(status === "CanLoadMore" || status === "LoadingMore") && (
									<div className="flex items-center justify-center flex-1 h-12">
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
											<AiMessages
												message={message}
												type="thread"
												isInputStatusLoading={isInputStatusLoading}
											/>
											{chatStatus === "streaming" &&
												!messageThatIsStreamingTextPartHasValue &&
												messageArray.length - 1 === index && (
													<div className="flex items-center justify-start flex-1 h-9">
														{chatStatusMessage ? (
															<Shimmer duration={3} spread={3}>
																{chatStatusMessage}
															</Shimmer>
														) : (
															<div className="size-4 rounded-full bg-gray-400 animate-ping" />
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

				{!isLoading && !!messages?.length && (
					<ContainerWithMargin>
						<ContainerWithMaxWidth className={cn("pb-2 flex-1 bg-background")}>
							<div className={cn("grid grid-cols-2 h-20 justify-between py-2")}>
								<Button
									variant="ghost"
									className="rounded-md p-2 flex flex-col items-start h-fit"
									disabled={
										isLoading ||
										!learningChatsContent?.length ||
										!currentLearningChatIndex
									}
									onClick={() => {
										if (isLoading || !learningChatsContent?.length) return;
										if (!currentLearningChatIndex) return;
										navigate({
											to: "/l/{-$learningId}/c/{-$chatId}",
											params: {
												learningId:
													learningChatsContent[currentLearningChatIndex - 1]
														.learningData?.uuid,
												chatId:
													learningChatsContent[currentLearningChatIndex - 1]
														.chatData?.uuid,
											},
										});
									}}
								>
									<div className="flex items-center gap-2">
										<SharedIcon icon={ArrowLeft02Icon} />
										<span className="text-sm font-medium text-accent-foreground">
											Previous
										</span>
									</div>

									<h1 className="text-xs font-medium">
										{
											learningChatsContent[currentLearningChatIndex - 1]
												?.metadata?.title
										}
									</h1>
								</Button>

								<Button
									variant="ghost"
									className="rounded-md p-2 flex flex-col items-end h-fit"
									disabled={
										isLoading ||
										!learningChatsContent?.length ||
										currentLearningChatIndex ===
											learningChatsContent?.length - 1
									}
									onClick={() => {
										if (isLoading || !learningChatsContent?.length) return;
										if (
											currentLearningChatIndex ===
											learningChatsContent?.length - 1
										)
											return;
										navigate({
											to: "/l/{-$learningId}/c/{-$chatId}",
											params: {
												learningId:
													learningChatsContent[currentLearningChatIndex + 1]
														.learningData?.uuid,
												chatId:
													learningChatsContent[currentLearningChatIndex + 1]
														.chatData?.uuid,
											},
										});
									}}
								>
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-accent-foreground">
											Next
										</span>
										<SharedIcon icon={ArrowRight02Icon} />
									</div>

									<h1 className="text-xs font-medium">
										{
											learningChatsContent[currentLearningChatIndex + 1]
												?.metadata?.title
										}
									</h1>
								</Button>
							</div>
						</ContainerWithMaxWidth>
					</ContainerWithMargin>
				)}
			</div>

			{isLearningCreationRoute && messageThatIsStreaming && (
				<Button
					variant="outline"
					className="absolute right-4 sm:right-8 lg:ringt-16 bottom-6 rounded-full aspect-square size-9 p-0!"
					onClick={handleAbortStreamByOrder}
				>
					<SharedIcon icon={StopIcon} />
				</Button>
			)}
		</>
	);
});

const AiLearningContent = memo(() => {
	const roomId = useGetRoomId();

	return (
		<div key={roomId} className={cn("relative")}>
			<AiLearningContentResult />
		</div>
	);
});

AiLearningContent.displayName = "AiLearningContent";

export default AiLearningContent;
