import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown02Icon } from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";
import { memo, useCallback, useMemo } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import SharedIcon from "../shared/shared-icon";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = memo(
	({ className, ...props }: ConversationProps) => (
		<StickToBottom
			className={cn(
				"relative flex-1 overflow-y-auto [overflow-anchor:none]",
				className,
			)}
			initial="instant"
			resize="smooth"
			role="log"
			{...props}
		/>
	),
);

export type ConversationContentProps = ComponentProps<
	typeof StickToBottom.Content
>;

export const ConversationContent = memo(
	({ className, ...props }: ConversationContentProps) => (
		<StickToBottom.Content className={cn("p-3", className)} {...props} />
	),
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
};

export const ConversationEmptyState = memo(
	({
		className,
		title = "No messages yet",
		description = "Start a conversation to see messages here",
		icon,
		children,
		...props
	}: ConversationEmptyStateProps) => (
		<div
			className={cn(
				"flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
				className,
			)}
			{...props}
		>
			{children ?? (
				<>
					{icon && <div className="text-muted-foreground">{icon}</div>}
					<div className="space-y-1">
						<h3 className="font-medium text-sm">{title}</h3>
						{description && (
							<p className="text-muted-foreground text-sm">{description}</p>
						)}
					</div>
				</>
			)}
		</div>
	),
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

const ConversationScrollButtonContent = memo(
	({
		className,
		handleScrollToBottom,
		...props
	}: ConversationScrollButtonProps & { handleScrollToBottom: () => void }) => {
		return (
			<Button
				className={cn(
					"absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
					className,
				)}
				onClick={handleScrollToBottom}
				size="icon"
				type="button"
				variant="outline"
				{...props}
			>
				<SharedIcon icon={ArrowDown02Icon} />
			</Button>
		);
	},
);

export const ConversationScrollButton = memo(
	({ className, ...props }: ConversationScrollButtonProps) => {
		const { isAtBottom, scrollToBottom } = useStickToBottomContext();

		const handleScrollToBottom = useCallback(() => {
			scrollToBottom();
		}, [scrollToBottom]);

		const isMemoizedAtBottom = useMemo(() => isAtBottom, [isAtBottom]);

		if (isMemoizedAtBottom) return null;

		return (
			<ConversationScrollButtonContent
				handleScrollToBottom={handleScrollToBottom}
				{...props}
			/>
		);
	},
);

Conversation.displayName = "Conversation";
ConversationContent.displayName = "ConversationContent";
ConversationEmptyState.displayName = "ConversationEmptyState";
ConversationScrollButton.displayName = "ConversationScrollButton";
ConversationScrollButtonContent.displayName = "ConversationScrollButtonContent";
