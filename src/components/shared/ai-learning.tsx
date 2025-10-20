import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import SharedIcon from "./shared-icon";

function AiLearning() {
  return (
    <div className="flex min-h-full">
      <div
        className={cn(
          "text-base mx-auto [--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(6)] lg:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)"
        )}
      >
        <div
          className={cn(
            "[--thread-content-max-width:40rem] lg:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 grid h-full [width:min(90cqw,var(--thread-content-max-width))] grid-rows-[auto_min-content_min-content]"
          )}
        >
          <div className="flex min-w-0 flex-col gap-8 pb-6 mt-13 self-start max-md:mt-0">
            <div className="flex justify-between max-md:flex-col max-md:gap-4">
              <div className="flex items-center gap-1.5 max-md:-translate-x-1">
                <SharedIcon icon={Folder01Icon} size={36} className="size-7" />
                <h1 className="text-2xl">Learning</h1>
              </div>

              <Button variant="outline">Add Knowledge</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiLearning;
