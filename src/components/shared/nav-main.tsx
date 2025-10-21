import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import BtnLoginOrChild from "./btn-login-or-child";
import { Search01Icon, TabletPenIcon } from "@hugeicons/core-free-icons";
import SharedIcon from "./shared-icon";
import { useConvexAuth } from "convex/react";

export function NavMain() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <BtnLoginOrChild>
                <SidebarMenuButton tooltip="New Chat">
                  <SharedIcon icon={TabletPenIcon} />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </BtnLoginOrChild>
            </SidebarMenuItem>

            {!isLoading && isAuthenticated && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Search">
                  <SharedIcon icon={Search01Icon} />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarMenu>
    </SidebarGroup>
  );
}
