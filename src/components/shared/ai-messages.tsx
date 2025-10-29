import { MessageType } from "@/constants/messages";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { CanvasType } from "@/zustand/canvas";
import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import type { TextUIPart } from "ai";
import type { streamSectionValidator } from "convex/schema";
import type { Infer } from "convex/values";
import { Fragment, memo, useCallback, useMemo, useState } from "react";
import { Message, MessageContent } from "../ai-elements/message";
import { Response } from "../ai-elements/response";
import AiActions from "./ai-actions";

interface AiMessagesProps {
	type: Infer<typeof streamSectionValidator>;
	message: UIMessage;
	handleOpenCanvas: ({
		type,
		threadId,
	}: { type: CanvasType; threadId: string; title?: string }) => void;
}

const AiMessageText = memo(
	({
		message,
		partText,
	}: {
		message: UIMessage;
		partText: TextUIPart;
	}) => {
		const [text] = useSmoothText(partText?.text ?? "", {
			startStreaming: message.status === "streaming",
		});

		return (
			<Message from={message.role}>
				<MessageContent variant="flat">
					<Response>{text}</Response>
				</MessageContent>
			</Message>
		);
	},
);

const AiMessages = memo((props: AiMessagesProps) => {
	const { type, message, handleOpenCanvas } = props;

	const isMobile = useIsMobile();
	const [hoveredId, setHoveredId] = useState<string>("");

	const isUser = useMemo(() => message.role === "user", [message.role]);

	const handleMouseEnter = useCallback(() => {
		if (isMobile || !isUser) return;
		setHoveredId(message.id);
	}, [isMobile, isUser, message.id]);

	const handleMouseLeave = useCallback(() => {
		if (isMobile || !isUser) return;
		setHoveredId("");
	}, [isMobile, isUser]);

	return (
		<div
			data-message-id={message.id}
			className={cn(
				"cursor-default [content-visibility:auto]",
				isUser ? "first:mt-0 mt-12" : "",
			)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{message.parts.map((part, i) => {
				switch (part.type) {
					case MessageType.TEXT:
						return (
							<Fragment key={`text_${i}-${message.id}`}>
								<AiMessageText message={message} partText={part} />
							</Fragment>
						);

					// case MessageType.CANVAS:
					// 	return (
					// 		<div
					// 			role="button"
					// 			tabIndex={0}
					// 			className="flex flex-col gap-1 rounded-2-5xl px-4 py-3 text-sm border border-border w-full mt-3 cursor-pointer"
					// 			onClick={() =>
					// 				handleOpenCanvas({
					// 					type: CanvasType.CONTENT,
					// 					threadId: message.id,
					// 				})
					// 			}
					// 		>
					// 			<h1 className="text-base font-semibold">
					// 				{part.title}
					// 			</h1>
					// 			<p className="text-sm text-gray-400">
					// 				Interactive canvas
					// 			</p>
					// 		</div>
					// 	);

					default:
						return null;
				}
			})}

			{/* actions */}
			{message?.status !== "pending" && message?.status !== "streaming" && (
				<AiActions
					type={type}
					message={message}
					hoveredId={hoveredId}
					handleOpenCanvas={handleOpenCanvas}
				/>
			)}
		</div>
	);
});

export default AiMessages;
