import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BlockGameIcon } from "@hugeicons/core-free-icons";
import { memo } from "react";
import SharedIcon from "./shared-icon";

function NavExplore() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Explore</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					<SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
						<SidebarMenuButton
							tooltip="Community"
							className="cursor-pointer rounded-tlarge"
						>
							<SharedIcon icon={BlockGameIcon} />
							<span>Community</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export default memo(NavExplore);
