import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	AlertSquareIcon,
	Home07Icon,
	RefreshIcon,
} from "@hugeicons/core-free-icons";
import { type ErrorComponentProps, useNavigate } from "@tanstack/react-router";
import SharedIcon from "./shared-icon";

interface ErrorClientProps extends Partial<ErrorComponentProps> {
	type?: "error" | "not-found";
}

export function ErrorClient({ type = "error", ...props }: ErrorClientProps) {
	const { error, reset } = props;

	const navigate = useNavigate();

	const title = type === "error" ? "Error" : "Not Found";
	const description =
		type === "error"
			? "An error occurred while loading the page."
			: "The page you are looking for does not exist.";

	return (
		<Empty className="from-background dark:from-muted/50 to-gray-100 dark:to-background h-svh lg:h-lvh bg-linear-to-b from-30%">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<SharedIcon icon={AlertSquareIcon} />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
				<blockquote className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
					{JSON.stringify(error?.message)}
				</blockquote>
			</EmptyHeader>
			<EmptyContent className="flex-row justify-center">
				<Button
					variant="outline"
					size="sm"
					className="cursor-pointer"
					onClick={() => {
						if (type === "error" && reset) {
							reset();
						} else {
							navigate({ to: "/" });
						}
					}}
				>
					<SharedIcon icon={type === "error" ? RefreshIcon : Home07Icon} />
					{type === "error" ? "Refresh" : "Go to Home"}
				</Button>

				{type === "error" && (
					<Button
						variant="outline"
						size="sm"
						className="cursor-pointer"
						onClick={() => {
							navigate({ to: "/" });
						}}
					>
						<SharedIcon icon={Home07Icon} />
						Go to Home
					</Button>
				)}
			</EmptyContent>
		</Empty>
	);
}
