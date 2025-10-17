import * as React from "react";
import { NavMain } from "@/components/shared/nav-main";
import { NavLearning } from "@/components/shared/nav-learning";
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
import { NavExplore } from "./nav-explore";
import { useUser } from "@clerk/clerk-react";
import { Button } from "../ui/button";
import { Cancel01Icon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { NavChat } from "./nav-chat";
import SharedIcon from "./shared-icon";

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar> & { side?: "left" | "right" }) {
  const { state, isMobile, toggleSidebar, pretendIsMobile, openMobile } =
    useSidebar();

  const { isSignedIn } = useUser();

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
          pretendIsMobile && (openMobile ? "items-end" : "items-center")
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
        {isSignedIn && (
          <>
            <NavLearning />
            <NavChat />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
