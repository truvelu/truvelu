import { cn } from "@/lib/utils";
import {
	HugeiconsIcon,
	type HugeiconsProps,
	type IconSvgElement,
} from "@hugeicons/react";
import { memo } from "react";

interface IconProps extends Omit<HugeiconsProps, "icon"> {
	icon: IconSvgElement;
}

function SharedIcon({ icon, size, className, ...props }: IconProps) {
	return (
		<HugeiconsIcon
			icon={icon}
			size={size}
			className={cn("size-5", className)}
			{...props}
		/>
	);
}

export default memo(SharedIcon);
