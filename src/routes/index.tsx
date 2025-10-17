import { createFileRoute } from "@tanstack/react-router";
import { AiPromptInput } from "@/components/shared/ai-prompt-input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="flex-1 bg-white">
      <div
        className={cn(
          "top-0 translate-y-[calc((100vh/3)-52px)]",
          "w-full h-fit [--thread-content-max-width:40rem] thread-lg:[--thread-content-max-width:48rem] max-w-(--thread-content-max-width) mx-auto",
          "[--thread-content-margin:--spacing(4)] thread-sm:[--thread-content-margin:--spacing(6)] thread-lg:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)"
        )}
      >
        <AiPromptInput onReady={() => {}} />
      </div>
    </div>
  );
}
