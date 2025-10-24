import { cn } from "@/lib/utils";
import { type ComponentProps, memo, useMemo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
	({ className, ...props }: ResponseProps) => {
		const memoizedChildren = useMemo(() => props.children, [props.children]);
		return (
			<Streamdown
				className={cn(
					"size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
					className,
				)}
				{...props}
			>
				{memoizedChildren}
			</Streamdown>
		);
	},
	(prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
