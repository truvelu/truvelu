import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";

export type ActionsProps = ComponentProps<"div"> & {
	role?: "user" | "assistant" | "system";
	showOnHover?: boolean;
	hovered?: boolean;
};

export const Actions = memo(
	({
		className,
		children,
		role = "user",
		showOnHover = false,
		hovered = false,
		...props
	}: ActionsProps) => {
		const isMobile = useIsMobile();
		const isUser = role === "user";

		return (
			<div
				className={cn(
					"transition-opacity duration-200",
					"flex items-center gap-1 h-12",
					isUser && "justify-end",
					!isMobile && isUser && !hovered && showOnHover
						? "opacity-0"
						: "opacity-100",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);

export type ActionProps = ComponentProps<typeof Button> & {
	tooltip?: string;
	label?: string;
};

export const Action = memo(
	({
		tooltip,
		children,
		label,
		className,
		variant = "ghost",
		size = "sm",
		...props
	}: ActionProps) => {
		const button = (
			<Button
				className={cn(
					"relative size-8 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer",
					className,
				)}
				size={size}
				type="button"
				variant={variant}
				{...props}
			>
				{children}
				<span className="sr-only">{label || tooltip}</span>
			</Button>
		);

		if (tooltip) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent>
							<p>{tooltip}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return button;
	},
);

Action.displayName = "Action";
Actions.displayName = "Actions";
