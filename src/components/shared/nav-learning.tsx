import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  ArrowRight01Icon,
  Delete02Icon,
  Edit03Icon,
  Folder01Icon,
  FolderAddIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import SharedIcon from "./shared-icon";

const NavNewLearningItem = () => {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Learning"
        className="cursor-pointer rounded-tlarge"
      >
        <SharedIcon icon={FolderAddIcon} />
        <span>Learning</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const NavLearningItem = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <Collapsible
      asChild
      onOpenChange={setIsOpen}
      open={isOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <div className="flex-1 justify-between flex flex-row items-center gap-1">
          <SidebarMenuButton
            tooltip="Learning"
            className="rounded-tlarge relative cursor-pointer"
            onClick={() => {
              navigate({
                to: "/l/{-$learningId}",
                params: {
                  learningId: "123",
                },
              });
            }}
          >
            <CollapsibleTrigger
              className="absolute left-0.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent hover:bg-gray-200 size-7 flex items-center justify-center rounded-tlarge"
              onClick={(e) => e.stopPropagation()}
              asChild
            >
              <div>
                {isOpen ? (
                  <SharedIcon icon={FolderOpenIcon} />
                ) : (
                  <SharedIcon icon={Folder01Icon} />
                )}
              </div>
            </CollapsibleTrigger>
            <span className="pl-7">Learning</span>
          </SidebarMenuButton>
        </div>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                className="cursor-pointer rounded-tlarge"
                onClick={() => {
                  navigate({
                    to: "/l/{-$learningId}/c/{-$chatId}",
                    params: {
                      learningId: crypto.randomUUID(),
                      chatId: crypto.randomUUID(),
                    },
                  });
                }}
              >
                <span>Learning A</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                className="cursor-pointer rounded-tlarge"
                onClick={() => {
                  navigate({
                    to: "/l/{-$learningId}/c/{-$chatId}",
                    params: {
                      learningId: crypto.randomUUID(),
                      chatId: crypto.randomUUID(),
                    },
                  });
                }}
              >
                <span>Learning B</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <SharedIcon icon={MoreHorizontalIcon} />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="rounded-tmedium"
          >
            <DropdownMenuItem className="p-2.5 rounded-xl">
              <SharedIcon icon={Edit03Icon} />
              <span>Rename Learning</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="!text-destructive p-2.5 rounded-xl">
              <SharedIcon icon={Delete02Icon} className="text-destructive" />
              <span>Delete Learning</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </Collapsible>
  );
};

export function NavLearning() {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup className="group-data-[collapsible=icon]:opacity-0">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="gap-1 cursor-pointer">
            Learnings
            <SharedIcon
              icon={ArrowRight01Icon}
              className="transition-transform group-data-[state=open]/collapsible:rotate-90"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavNewLearningItem />
              <NavLearningItem />
              <NavLearningItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
