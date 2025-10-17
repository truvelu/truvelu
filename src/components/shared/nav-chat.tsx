import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import SharedIcon from "./shared-icon";

const NavChatItem = () => {
  const navigate = useNavigate();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Chat"
        className="cursor-pointer rounded-3.5xl"
        onClick={() => {
          navigate({
            to: "/c/{-$chatId}",
            params: {
              chatId: "123",
            },
          });
        }}
      >
        <span>Chat</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export function NavChat() {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup className="group-data-[collapsible=icon]:opacity-0">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="gap-1 cursor-pointer">
            Chats
            <SharedIcon
              icon={ArrowRight01Icon}
              className="transition-transform group-data-[state=open]/collapsible:rotate-90"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavChatItem />
              <NavChatItem />
              <NavChatItem />
              <NavChatItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
