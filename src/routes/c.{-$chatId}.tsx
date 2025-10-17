import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { AiConversationResponsive } from "@/components/shared/ai-conversation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export const Route = createFileRoute("/c/{-$chatId}")({
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
  const { isSignedIn, user, isLoaded } = useUser();

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

  return (
    <div className="relative flex-1 bg-white h-full overflow-y-auto">
      <AiConversationResponsive />
    </div>
  );
}
