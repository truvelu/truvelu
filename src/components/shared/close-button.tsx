import { ComponentProps, memo } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { type HugeiconsProps } from "@hugeicons/react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import SharedIcon from "./shared-icon";

interface CloseButtonProps {
  buttonProps?: ComponentProps<typeof Button>;
  iconProps?: HugeiconsProps;
}

function CloseButton(props: CloseButtonProps) {
  const { buttonProps, iconProps } = props ?? {};

  const {
    variant = "ghost",
    size = "icon",
    className,
    ...restButtonProps
  } = buttonProps ?? {};
  const {
    size: iconSize = 24,
    className: iconClassName,
    ...restIconProps
  } = iconProps ?? {};

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "p-0 items-center justify-center cursor-pointer",
        className
      )}
      {...restButtonProps}
    >
      <SharedIcon
        icon={Cancel01Icon}
        size={iconSize}
        color="currentColor"
        className={cn("size-5", iconClassName)}
        {...restIconProps}
      />
    </Button>
  );
}

export default memo(CloseButton);
