import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { AlertSquareIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { CodeBlock } from "../ai-elements/code-block";
import SharedIcon from "./shared-icon";

interface ErrorClientProps {
	type?: "error" | "not-found";
	error?: ErrorComponentProps | null;
}

export function ErrorClient({
	type = "error",
	error = null,
}: ErrorClientProps) {
	const title = type === "error" ? "Error" : "Not Found";
	const description =
		type === "error"
			? "An error occurred while loading the page."
			: "The page you are looking for does not exist.";
	return (
		<Empty className="from-muted/50 to-background h-full bg-linear-to-b from-30%">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<SharedIcon icon={AlertSquareIcon} />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
				{error !== null && (
					<CodeBlock language="json" code={JSON.stringify(error, null, 2)} />
				)}
			</EmptyHeader>
			<EmptyContent>
				<Button variant="outline" size="sm">
					<SharedIcon icon={RefreshIcon} />
					Refresh
				</Button>
			</EmptyContent>
		</Empty>
	);
}
