import { MessageType } from "@/constants/messages";
import { useCanvasOpenStatus } from "@/hooks/use-canvas";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import type { Message, UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import {
	Comment01Icon,
	CommentAdd02Icon,
	Copy01Icon,
	RefreshIcon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { SectionType } from "convex/schema";
import { memo, useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Action, Actions } from "../ai-elements/actions";
import { useAuth } from "../provider/auth-provider";
import { useSidebar } from "../ui/sidebar";
import SharedIcon from "./shared-icon";

interface AiActionsProps {
	type: SectionType;
	message: UIMessage;
	hoveredId: string;
}

const AiActions = memo((props: AiActionsProps) => {
	const { type, message, hoveredId } = props;

	const roomId = useGetRoomId();
	const openCanvas = useCanvasOpenStatus();

	const {
		open: sidebarOpen,
		setOpen: setSidebarOpen,
		setOpenMobile: setSidebarOpenMobile,
	} = useSidebar();
	const { upsertCanvas, getCanvas, removeCanvas, setOpenCanvas } =
		useCanvasStore(
			useShallow(
				({ upsertCanvas, getCanvas, removeCanvas, setOpenCanvas }) => ({
					upsertCanvas,
					getCanvas,
					removeCanvas,
					setOpenCanvas,
				}),
			),
		);

	const isMainThread = type === "main";

	const { userId } = useAuth();
	const { data: chat } = useQuery({
		...convexQuery(
			api.chat.queries.getChat,
			roomId
				? {
						userId,
						uuid: roomId,
					}
				: "skip",
		),
		gcTime: Number.POSITIVE_INFINITY,
	});
	const { data: discussion } = useQuery(
		convexQuery(
			api.chat.queries.getDiscussionByLinkedMessageId,
			message.id
				? {
						linkedMessageId: message.id,
						userId,
					}
				: "skip",
		),
	);
	const { data: chatDiscussionMetadata } = useQuery(
		convexQuery(
			api.chat.queries.getMetadata,
			discussion?.threadId
				? {
						threadId: discussion?.threadId ?? "",
					}
				: "skip",
		),
	);
	const { results: discussionMessages } = useUIMessages(
		api.chat.queries.listThreadMessages,
		discussion?.threadId ? { threadId: discussion?.threadId ?? "" } : "skip",
		{ initialNumItems: 5, stream: false },
	);
	const createDiscussion = useMutation({
		mutationKey: ["createDiscussion"],
		mutationFn: useConvexMutation(api.chat.mutations.createDiscussion),
	});

	const textPart = useMemo(
		() => message.parts.find((part) => part.type === MessageType.TEXT),
		[message.parts],
	);
	const preDiscussionMessageFinal = useMemo<Message[]>(() => {
		return [
			{
				role: message.role,
				content: message.text,
			},
		];
	}, [message]);

	const handleOpenCanvas = useCallback(
		({
			type,
			threadId,
			title,
		}: {
			type: CanvasType;
			threadId: string;
			title?: string;
		}) => {
			const existingCanvas = getCanvas({
				roomId,
				threadId,
				type,
			});

			if (!!existingCanvas?.length && !openCanvas) {
				setOpenCanvas(roomId, true);
			} else if (!!existingCanvas?.length && openCanvas) {
				removeCanvas({
					type,
					roomId,
					threadId,
				});
			} else {
				upsertCanvas({
					type,
					data: { threadId, roomId, title },
				});
			}

			if (existingCanvas.length > 0 && sidebarOpen) return;
			setSidebarOpen(false);
			setSidebarOpenMobile(false);
		},
		[
			roomId,
			sidebarOpen,
			openCanvas,
			getCanvas,
			setOpenCanvas,
			removeCanvas,
			upsertCanvas,
			setSidebarOpen,
			setSidebarOpenMobile,
		],
	);

	return (
		<Actions role={message.role} showOnHover hovered={hoveredId === message.id}>
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

			{isMainThread && (
				<Action
					label={discussion ? "Deep Discussion" : "New Deep Discussion"}
					className={cn(
						!!discussion && "rounded-tlarge px-2.5 w-fit border border-ring",
					)}
					onClick={() => {
						if (!chat?._id) return;
						if (!discussion) {
							createDiscussion.mutate(
								{
									parentChatId: chat?._id,
									linkedMessageId: message.id,
									messages: preDiscussionMessageFinal,
									agentType: "question-answering",
									userId,
								},
								{
									onSuccess: ({ threadId }) => {
										handleOpenCanvas({
											type: CanvasType.THREAD,
											threadId,
											title: chatDiscussionMetadata?.title ?? "New Discussion",
										});
									},
								},
							);
							return;
						}

						handleOpenCanvas({
							type: CanvasType.THREAD,
							threadId: discussion?.threadId ?? "",
							title: chatDiscussionMetadata?.title ?? "",
						});
					}}
				>
					<SharedIcon icon={discussion ? Comment01Icon : CommentAdd02Icon} />
					{!!discussion && discussionMessages?.length && (
						<span className="text-sm font-medium">
							{discussionMessages?.length === 5
								? "5+ Messages"
								: `${discussionMessages?.length} Messages`}
						</span>
					)}
				</Action>
			)}
		</Actions>
	);
});

export default AiActions;
