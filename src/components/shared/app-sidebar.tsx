import { NavLearning } from "@/components/shared/nav-learning";
import { NavMain } from "@/components/shared/nav-main";
import { NavUser } from "@/components/shared/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Cancel01Icon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { useConvexAuth } from "convex/react";
import type * as React from "react";
import { Button } from "../ui/button";
import { NavChat } from "./nav-chat";
import { NavExplore } from "./nav-explore";
import SharedIcon from "./shared-icon";

export function AppSidebar({
	...props
}: React.ComponentProps<typeof Sidebar> & { side?: "left" | "right" }) {
	const { state, isMobile, toggleSidebar, pretendIsMobile, openMobile } =
		useSidebar();

	const { isAuthenticated, isLoading } = useConvexAuth();

	if (isLoading || !isAuthenticated) return null;

	return (
		<Sidebar collapsible="icon" {...props} side={props?.side ?? "left"}>
			<SidebarHeader
				className={cn(
					"h-[3.25rem] mb-1 flex justify-center",
					!isMobile
						? state === "collapsed"
							? "items-center"
							: "items-end"
						: "items-end",
					pretendIsMobile && (openMobile ? "items-end" : "items-center"),
				)}
			>
				<Button
					variant="ghost"
					size="icon"
					className="p-2 cursor-pointer"
					onClick={() => toggleSidebar()}
				>
					<SharedIcon icon={isMobile ? Cancel01Icon : SidebarLeftIcon} />
				</Button>
			</SidebarHeader>

			<SidebarContent>
				<NavMain />
				<NavExplore />
				<NavLearning />
				<NavChat />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
