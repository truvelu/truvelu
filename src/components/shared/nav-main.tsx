import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Search01Icon, TabletPenIcon } from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import BtnLoginOrChild from "./btn-login-or-child";
import SharedIcon from "./shared-icon";

export function NavMain() {
	const navigate = useNavigate();

	const handleNewChat = () => {
		navigate({ to: "/" });
	};

	return (
		<SidebarGroup>
			<SidebarMenu>
				<SidebarGroupContent>
					<SidebarMenu>
						<SidebarMenuItem>
							<BtnLoginOrChild>
								<SidebarMenuButton tooltip="New Chat" onClick={handleNewChat}>
									<SharedIcon icon={TabletPenIcon} />
									<span>New Chat</span>
								</SidebarMenuButton>
							</BtnLoginOrChild>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton tooltip="Search">
								<SharedIcon icon={Search01Icon} />
								<span>Search</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarMenu>
		</SidebarGroup>
	);
}
