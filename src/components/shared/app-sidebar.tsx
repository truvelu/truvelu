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
import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Button } from "../ui/button";
import { NavChat } from "./nav-chat";
import { NavExplore } from "./nav-explore";
import SharedIcon from "./shared-icon";

export const AppSidebar = React.memo(
	({
		...props
	}: React.ComponentProps<typeof Sidebar> & { side?: "left" | "right" }) => {
		const navigate = useNavigate();
		const { state, isMobile, toggleSidebar, pretendIsMobile, openMobile } =
			useSidebar();

		const [isHovered, setIsHovered] = React.useState(false);

		const handleMouseEnter = () => {
			if (state !== "collapsed") return;
			setIsHovered(true);
		};
		const handleMouseLeave = () => {
			if (state !== "collapsed") return;
			setIsHovered(false);
		};

		return (
			<Sidebar collapsible="icon" {...props} side={props?.side ?? "left"}>
				<SidebarHeader
					className={cn(
						"h-13 mb-1 flex flex-row justify-between",
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
						className="relative size-9 p-0 flex items-center justify-center cursor-pointer"
						onClick={() => {
							if (state !== "collapsed") {
								navigate({ to: "/" });
							} else {
								toggleSidebar();
								setIsHovered(false);
							}
						}}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						<SharedIcon
							icon={isMobile ? Cancel01Icon : SidebarLeftIcon}
							className={cn(
								"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 opacity-0",
								state === "collapsed" && isHovered && "opacity-100",
							)}
						/>
						<img
							src="/logo.svg"
							alt="Truvelu"
							className={cn(
								"size-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 opacity-100",

								state === "collapsed" && isHovered && "opacity-0",
							)}
						/>
					</Button>

					{state !== "collapsed" && (
						<Button
							variant="ghost"
							size="icon"
							className="p-0 flex items-center justify-center cursor-pointer"
							onClick={() => toggleSidebar()}
						>
							<SharedIcon icon={isMobile ? Cancel01Icon : SidebarLeftIcon} />
						</Button>
					)}
				</SidebarHeader>

				<NavMain />

				<SidebarContent>
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
	},
);
