import { cn } from "@/lib/utils";
import {
	MoreHorizontalIcon,
	Share03Icon,
	SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useMatchRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { memo } from "react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import SharedIcon from "./shared-icon";

export const Header = () => {
	const matchRoute = useMatchRoute();
	const { isMobile } = useSidebar();

	const learningRoute = matchRoute({ to: "/l/{-$learningId}" });
	const chatRoute = matchRoute({ to: "/c/{-$chatId}" });

	const isLearningRoute = learningRoute !== false;
	const isChatRoute = chatRoute !== false;
	const isIndexRoute = !isLearningRoute && !isChatRoute;

	return (
		<div
			className={cn(
				"sticky top-0 z-10 h-header bg-white flex items-center border-b border-sidebar-border p-2.5 justify-between md:justify-end",
			)}
		>
			<Authenticated>
				{isMobile && <SidebarTrigger className="p-2 cursor-pointer" />}

				{!isIndexRoute && (
					<div className="flex gap-0.5 items-center">
						<Button
							variant="ghost"
							className="flex gap-1.5 rounded-tlarge cursor-pointer"
						>
							<SharedIcon icon={Share03Icon} size={5} className="size-5" />
							Share
						</Button>

						<Button
							variant="ghost"
							className="rounded-full has-[>svg]:p-0 size-7 cursor-pointer"
						>
							<SharedIcon icon={MoreHorizontalIcon} className="size-4" />
						</Button>

						<Separator
							orientation="vertical"
							className="min-h-7 w-px bg-sidebar-border mx-1"
						/>

						<Button
							variant="ghost"
							className="rounded-full has-[>svg]:p-0 size-7 cursor-pointer"
						>
							<SharedIcon icon={SidebarRightIcon} className="size-4" />
						</Button>
					</div>
				)}
			</Authenticated>
			<Unauthenticated>
				<Button className="rounded-tlarge px-3 h-9 cursor-pointer" asChild>
					<Link to="/auth">Log in</Link>
				</Button>
			</Unauthenticated>
		</div>
	);
};

export default memo(Header);
