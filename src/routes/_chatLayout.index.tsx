import { AiPromptInput } from "@/components/shared/ai-prompt-input";
import {
	ContainerWithMargin,
	ContainerWithMaxWidth,
} from "@/components/shared/container";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/")({
	component: App,
});

function App() {
	return (
		<div className="flex-1 bg-white">
			<div className={cn("top-0 translate-y-[calc((100vh/3)-52px)]")}>
				<ContainerWithMargin>
					<ContainerWithMaxWidth>
						<AiPromptInput onReady={() => {}} />
					</ContainerWithMaxWidth>
				</ContainerWithMargin>
			</div>
		</div>
	);
}
