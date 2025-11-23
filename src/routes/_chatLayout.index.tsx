import { AiConversationSkeleton } from "@/components/shared/ai-conversation-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
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
		<>
			<Authenticated>
				<Suspense fallback={<AiConversationSkeleton />}>
					<AiConversation />
				</Suspense>
			</Authenticated>
			<AuthLoading>
				<AiConversationSkeleton />
			</AuthLoading>
			<Unauthenticated>
				<AiConversationSkeleton />
			</Unauthenticated>
		</>
	);
}
