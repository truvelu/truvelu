import { MESSAGES_THREAD, MessageType } from "@/constants/messages";
import { cn } from "@/lib/utils";
import { CanvasType } from "@/zustand/canvas";
import type { UIMessage } from "@convex-dev/agent";
import {
	Comment01Icon,
	CommentAdd02Icon,
	Copy01Icon,
	RefreshIcon,
} from "@hugeicons/core-free-icons";
import { memo } from "react";
import { Action, Actions } from "../ai-elements/actions";
import SharedIcon from "./shared-icon";

interface AiActionsProps {
	message: UIMessage;
	hoveredId: string;
	handleOpenCanvas: ({
		type,
		threadId,
	}: { type: CanvasType; threadId: string }) => void;
}

const AiActions = memo((props: AiActionsProps) => {
	const { message, hoveredId, handleOpenCanvas } = props;

	const textPart = message.parts.find((part) => part.type === MessageType.TEXT);
	const deepDiscussion = MESSAGES_THREAD.find((msg) => msg.id === message.id);
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
						deepDiscussion?.messages?.length ? Comment01Icon : CommentAdd02Icon
					}
				/>
				{deepDiscussion?.messages?.length && (
					<span className="text-sm font-medium">
						{deepDiscussion?.messages?.length}
					</span>
				)}
			</Action>
		</Actions>
	);
});

export default AiActions;
