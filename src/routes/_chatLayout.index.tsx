import { AiConversationSkeleton } from "@/components/shared/ai-conversation-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const AiConversation = lazy(
	() => import("@/components/shared/ai-conversation"),
);

export const Route = createFileRoute("/_chatLayout/")({
	component: App,

	pendingComponent: AiConversationSkeleton,
});

function App() {
	return (
		<Suspense fallback={<AiConversationSkeleton />}>
			<AiConversation />
		</Suspense>
	);
}
