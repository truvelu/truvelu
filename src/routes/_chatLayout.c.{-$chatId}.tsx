import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignInButton, useUser } from "@clerk/clerk-react";
import AiConversation from "@/components/shared/ai-conversation";

export const Route = createFileRoute("/_chatLayout/c/{-$chatId}")({
  component: App,
  beforeLoad: (context) => {
    if (!context.params.chatId) {
      throw redirect({
        to: "/",
      });
    }
  },
});

function App() {
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
