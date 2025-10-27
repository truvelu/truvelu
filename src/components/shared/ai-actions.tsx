import { MessageType } from "@/constants/messages";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { cn } from "@/lib/utils";
import { CanvasType } from "@/zustand/canvas";
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
import { memo, useMemo } from "react";
import { v7 as uuid } from "uuid";
import { Action, Actions } from "../ai-elements/actions";
import SharedIcon from "./shared-icon";

interface AiActionsProps {
	isCanvas?: boolean;
	message: UIMessage;
	hoveredId: string;
	handleOpenCanvas: ({
		type,
		threadId,
	}: { type: CanvasType; threadId: string; title?: string }) => void;
}

const AiActions = memo((props: AiActionsProps) => {
	const { isCanvas, message, hoveredId, handleOpenCanvas } = props;

	const roomId = useGetRoomId();

	const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const { data: chat } = useQuery(
		convexQuery(
			api.chat.getChat,
			user?._id && roomId
				? {
						userId: user?._id?.toString() ?? "",
						uuid: roomId,
					}
				: "skip",
		),
	);
	const { data: discussion } = useQuery(
		convexQuery(
			api.discussion.getDiscussionByMessageIdAndUserId,
			user?._id && message.id
				? {
						messageId: message.id,
						userId: user?._id?.toString() ?? "",
					}
				: "skip",
		),
	);
	const { data: chatDiscussionMetadata } = useQuery(
		convexQuery(
			api.chat.getMetadata,
			discussion?.threadId
				? {
						threadId: discussion?.threadId ?? "",
					}
				: "skip",
		),
	);
	const { results: discussionMessages } = useUIMessages(
		api.chat.listThreadMessages,
		discussion?.threadId ? { threadId: discussion?.threadId ?? "" } : "skip",
		{ initialNumItems: 5, stream: false },
	);
	const createDiscussion = useMutation({
		mutationKey: ["createDiscussion"],
		mutationFn: useConvexMutation(api.discussion.createDiscussion),
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

			{!isCanvas && (
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
									chatId: chat?._id,
									messageId: message.id,
									messages: preDiscussionMessageFinal,
									uuid: uuid(),
									modelKey: "minimax/minimax-m2:free",
									userId: user?._id?.toString() ?? "",
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
								? "Messages 5+"
								: `Messages ${discussionMessages?.length}`}
						</span>
					)}
				</Action>
			)}
		</Actions>
	);
});

export default AiActions;
