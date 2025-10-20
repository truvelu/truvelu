import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import SharedIcon from "./shared-icon";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";

function AiLearning() {
  return (
    <div className="flex min-h-full">
      <ContainerWithMargin>
        <ContainerWithMaxWidth
          className={cn(
            "flex-1 grid h-full [width:min(90cqw,var(--thread-content-max-width))] grid-rows-[auto_min-content_min-content]"
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
        </ContainerWithMaxWidth>
      </ContainerWithMargin>
    </div>
  );
}

export default AiLearning;
