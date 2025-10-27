import AiConversation from "@/components/shared/ai-conversation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/")({
	ssr: false,

	component: App,
});

function App() {
	return <AiConversation />;
}
