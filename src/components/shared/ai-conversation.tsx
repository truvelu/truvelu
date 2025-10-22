import { MESSAGES, MESSAGES_THREAD, MessageType } from "@/constants/messages";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import {
	Comment01Icon,
	CommentAdd02Icon,
	Copy01Icon,
	Message01Icon,
	RefreshIcon,
} from "@hugeicons/core-free-icons";
import {
	Fragment,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { Action, Actions } from "../ai-elements/actions";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent } from "../ai-elements/message";
import { Response } from "../ai-elements/response";
import { useSidebar } from "../ui/sidebar";
import { AiPromptInput } from "./ai-prompt-input";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";
import SharedIcon from "./shared-icon";

const AiConversation = memo(() => {
	const isMobile = useIsMobile();
	const {
		open: sidebarOpen,
		setOpen: setSidebarOpen,
		setOpenMobile: setSidebarOpenMobile,
	} = useSidebar();
	const roomId = useGetRoomId();
	const { upsertCanvas, getCanvas, removeCanvas } = useCanvasStore(
		useShallow(({ upsertCanvas, getCanvas, removeCanvas }) => ({
			upsertCanvas,
			getCanvas,
			removeCanvas,
		})),
	);

	const inputRef = useRef<HTMLDivElement>(null);

	const [inputHeight, setInputHeight] = useState(0);
	const [hoveredId, setHoveredId] = useState<string>("");

	const handleInputReady = useCallback(() => {
		if (inputRef.current) {
			setInputHeight(inputRef.current.offsetHeight);
		}
	}, []);

	const handleOpenCanvas = ({
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
	};

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

	return (
		<>
			<Conversation
				className={cn(
					"h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))] flex-1",
					"[&>div]:[scrollbar-gutter:stable_both-edges]",
				)}
			>
				<ConversationContent className="px-0">
					<ContainerWithMargin
						asContent
						style={{
							paddingBottom: `calc(${inputHeight}px + 0.5rem + env(safe-area-inset-bottom) + 8rem)`,
						}}
					>
						<ContainerWithMaxWidth className="w-full">
							{!MESSAGES.length ? (
								<ConversationEmptyState
									icon={<SharedIcon icon={Message01Icon} size={48} />}
									title="Start a conversation"
									description="Type a message below to begin chatting"
								/>
							) : (
								MESSAGES.map((message) => {
									const textPart = message.parts.find(
										(part) => part.type === MessageType.TEXT,
									);
									const deepDiscussion = MESSAGES_THREAD.find(
										(msg) => msg.id === message.id,
									);

									return (
										<div
											key={message.id}
											className={cn(
												"cursor-default",
												message.role === "user" ? "first:mt-0 mt-12" : "",
											)}
											onMouseEnter={() => {
												if (isMobile) return;
												setHoveredId(message.id);
											}}
											onMouseLeave={() => {
												if (isMobile) return;
												setHoveredId("");
											}}
										>
											{message.parts.map((part, i) => {
												switch (part.type) {
													case MessageType.TEXT:
														return (
															<Fragment key={`${message.id}-${i}`}>
																<Message from={message.role}>
																	<MessageContent variant="flat">
																		<Response>{part.text}</Response>
																	</MessageContent>
																</Message>
															</Fragment>
														);

													case MessageType.CANVAS:
														return (
															<div
																role="button"
																tabIndex={0}
																className="flex flex-col gap-1 rounded-2-5xl px-4 py-3 text-sm border border-border w-full mt-3 cursor-pointer"
																onClick={() =>
																	handleOpenCanvas({
																		type: CanvasType.CONTENT,
																		threadId: message.id,
																	})
																}
															>
																<h1 className="text-base font-semibold">
																	{part.title}
																</h1>
																<p className="text-sm text-gray-400">
																	Interactive canvas
																</p>
															</div>
														);

													default:
														return null;
												}
											})}

											<Actions
												role={message.role}
												showOnHover
												hovered={hoveredId === message.id}
											>
												{message.role === "user" && (
													<Action onClick={() => {}} label="Retry">
														<SharedIcon icon={RefreshIcon} />
													</Action>
												)}

												{message.role === "assistant" && (
													<Action onClick={() => {}} label="Retry">
														<SharedIcon icon={RefreshIcon} />
													</Action>
												)}

												<Action
													onClick={() => {
														if (!textPart) return;
														navigator.clipboard.writeText(textPart.text);
													}}
													label="Copy"
												>
													<SharedIcon icon={Copy01Icon} />
												</Action>

												<Action
													label={
														deepDiscussion?.messages?.length
															? "Deep Discussion"
															: "New Deep Discussion"
													}
													className={cn(
														deepDiscussion?.messages?.length &&
															"rounded-tlarge px-2.5 w-fit border border-ring",
													)}
													onClick={() => {
														handleOpenCanvas({
															type: CanvasType.THREAD,
															threadId: message.id,
														});
													}}
												>
													<SharedIcon
														icon={
															deepDiscussion?.messages?.length
																? Comment01Icon
																: CommentAdd02Icon
														}
													/>
													{deepDiscussion?.messages?.length && (
														<span className="text-sm font-medium">
															{deepDiscussion?.messages?.length}
														</span>
													)}
												</Action>
											</Actions>
										</div>
									);
								})
							)}
						</ContainerWithMaxWidth>
					</ContainerWithMargin>
				</ConversationContent>
				<ConversationScrollButton
					style={{
						bottom: `calc(${inputHeight}px + 1.5rem)`,
					}}
				/>
			</Conversation>

			<div ref={inputRef} className={cn("absolute inset-x-0 bottom-0")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth className={cn("pb-2 bg-white flex-1")}>
						<AiPromptInput onReady={handleInputReady} />
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</>
	);
});

AiConversation.displayName = "AiConversation";

export default AiConversation;
