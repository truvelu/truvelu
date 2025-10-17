import AiConversation from "@/components/shared/ai-conversation";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_chatLayout/l/{-$learningId}_/c/{-$chatId}"
)({
  component: RouteComponent,
  beforeLoad: (context) => {
    if (!!context.params.learningId && !context.params.chatId) {
      throw redirect({
        to: "/l/{-$learningId}",
      });
    }

    if (!context.params.learningId && !context.params.chatId) {
      throw redirect({
        to: "/",
      });
    }
  },
});

function RouteComponent() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="p-4">
        <SignInButton />
      </div>
    );
  }

  return <AiConversation />;
}
