import { useCanvasOpenStatus } from "@/hooks/use-canvas";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface Container extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	className?: string;
}

const ContainerWithMaxWidth = memo(
	({ children, className, ...props }: Container) => {
		const canvasOpenStatus = useCanvasOpenStatus();
		return (
			<div
				className={cn(
					"[--thread-content-max-width:40rem] mx-auto max-w-(--thread-content-max-width)",
					!canvasOpenStatus && "lg:[--thread-content-max-width:48rem]",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);

const ContainerWithMargin = memo(
	({
		children,
		className,
		asContent = false,
		...props
	}: Container & {
		asContent?: boolean;
	}) => {
		const canvasOpenStatus = useCanvasOpenStatus();
		return (
			<div
				className={cn(
					"mx-auto px-(--thread-content-margin) [--thread-content-margin:--spacing(4)]",
					!canvasOpenStatus &&
						(asContent
							? "sm:[--thread-content-margin:--spacing(8)]"
							: "sm:[--thread-content-margin:--spacing(6)]"),
					!canvasOpenStatus && "lg:[--thread-content-margin:--spacing(16)]",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);

ContainerWithMargin.displayName = "ContainerWithMargin";
ContainerWithMaxWidth.displayName = "ContainerWithMaxWidth";

export { ContainerWithMaxWidth, ContainerWithMargin };
