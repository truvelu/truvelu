import { cn } from "@/lib/utils";
import { HugeiconsProps } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import SharedIcon from "../shared/shared-icon";

function Spinner({ className, ...props }: HugeiconsProps) {
  return (
    <SharedIcon
      icon={Loading03Icon}
      role="status"
      aria-label="Loading"
      className={cn("animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
