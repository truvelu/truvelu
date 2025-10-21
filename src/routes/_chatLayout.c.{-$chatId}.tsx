import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import AiConversation from "@/components/shared/ai-conversation";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";

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
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  if (!isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <Button onClick={() => navigate({ to: "/auth" })} className="w-full rounded-tmedium cursor-pointer">Sign in</Button>
      </div>
    );
  }

  return <AiConversation />;
}
