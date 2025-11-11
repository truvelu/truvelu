import { MessageType } from "@/constants/messages";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import {
	type ReasoningUIPart,
	type TextUIPart,
	type ToolUIPart,
	getToolName,
} from "ai";
import type { streamSectionValidator } from "convex/schema";
import type { Infer } from "convex/values";
import {
	Fragment,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Message, MessageContent } from "../ai-elements/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "../ai-elements/reasoning";
import { Response } from "../ai-elements/response";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "../ai-elements/tool";
import AiActions from "./ai-actions";

interface AiMessagesProps {
	type: Infer<typeof streamSectionValidator>;
	message: UIMessage;
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

const AiMessageReasoning = memo(
	({ partReasoning }: { partReasoning: ReasoningUIPart }) => {
		const isStreaming = useMemo(
			() => partReasoning.state === "streaming",
			[partReasoning.state],
		);
		const [text] = useSmoothText(partReasoning.text ?? "", {
			startStreaming: isStreaming,
		});

		const [_isStreaming, setIsStreaming] = useState(isStreaming);

		useEffect(() => {
			setIsStreaming(isStreaming);
		}, [isStreaming]);

		return (
			<Reasoning className="w-full" isStreaming={_isStreaming}>
				<ReasoningTrigger />
				<ReasoningContent>{text}</ReasoningContent>
			</Reasoning>
		);
	},
);

const AiMessageTool = memo(({ partTool }: { partTool: ToolUIPart }) => {
	return (
		<Tool>
			<ToolHeader
				state={partTool?.state}
				title={getToolName(partTool)}
				type={partTool?.type}
			/>
			<ToolContent>
				<ToolInput input={partTool?.input} />
				<ToolOutput errorText={partTool?.errorText} output={partTool?.output} />
			</ToolContent>
		</Tool>
	);
});

const AiMessages = memo(
	(props: AiMessagesProps) => {
		const { type, message } = props;

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
					const isTool = (t: typeof part.type): t is `tool-${string}` =>
						t.startsWith("tool-");

					if (isTool(part.type)) {
						return (
							<Fragment key={`tool_${i}-${message.id}`}>
								<AiMessageTool partTool={part as ToolUIPart} />
							</Fragment>
						);
					}

					switch (part.type) {
						case MessageType.TEXT:
							return (
								<Fragment key={`text_${i}-${message.id}`}>
									<AiMessageText message={message} partText={part} />
								</Fragment>
							);

						case "reasoning":
							return (
								<Fragment key={`reasoning_${i}-${message.id}`}>
									<AiMessageReasoning partReasoning={part} />
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
					<AiActions type={type} message={message} hoveredId={hoveredId} />
				)}
			</div>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison function for better memoization
		// Only re-render if message ID changed, parts length changed, or streaming status changed
		if (prevProps.message.id !== nextProps.message.id) return false;
		if (prevProps.message.parts.length !== nextProps.message.parts.length)
			return false;

		return true;
	},
);

export default AiMessages;
