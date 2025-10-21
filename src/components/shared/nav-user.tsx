import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SignInButton, SignOutButton, useUser } from "@clerk/clerk-react";
import {
  CheckmarkBadge02Icon,
  CreditCardIcon,
  Logout05Icon,
  SparklesIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import SharedIcon from "./shared-icon";

const ModalNavUserLogout = ({
  isOpenModalLogout,
  onValueChangeModalLogout,
}: {
  isOpenModalLogout: boolean;
  onValueChangeModalLogout: (open: boolean) => void;
}) => {
  const { user } = useUser();

  return (
    <Dialog open={isOpenModalLogout} onOpenChange={onValueChangeModalLogout}>
      <DialogContent
        className="px-6 py-8 w-fit h-fit md:p-10 rounded-tlarge"
        showCloseButton={false}
      >
        <div className="flex-1 sm:max-w-80 text-balance">
          <h1 className="text-2xl font-semibold text-center">
            Are you sure you want to log out?
          </h1>
          <p className="text-xl text-center text-gray-600 pt-4 pb-6">
            Log out of Platform as {user?.emailAddresses[0]?.emailAddress}?
          </p>
          <div className="flex flex-col gap-4">
            <SignOutButton>
              <Button className="w-full rounded-tmedium cursor-pointer">
                Log out
              </Button>
            </SignOutButton>
            <Button
              variant="outline"
              className="w-full rounded-tmedium cursor-pointer"
              onClick={() => onValueChangeModalLogout(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function NavUser() {
  const { user, isSignedIn } = useUser();
  const { isMobile } = useSidebar();

  const [isOpenModalLogout, setIsOpenModalLogout] = useState(false);

  const onValueChangeModalLogout = (open: boolean) => {
    setIsOpenModalLogout(open);
  };

  if (!isSignedIn) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button className="w-full rounded-tmedium cursor-pointer" asChild>
              <SignInButton mode="modal">Sign in</SignInButton>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.fullName}</span>
                </div>
                <SharedIcon icon={UnfoldMoreIcon} className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.imageUrl}
                      alt={user?.fullName ?? ""}
                    />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.fullName}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <SharedIcon icon={SparklesIcon} />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <SharedIcon icon={CheckmarkBadge02Icon} />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SharedIcon icon={CreditCardIcon} />
                  Billing
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onValueChangeModalLogout(true)}
                className="w-full rounded-tmedium cursor-pointer"
              >
                <SharedIcon icon={Logout05Icon} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ModalNavUserLogout
        isOpenModalLogout={isOpenModalLogout}
        onValueChangeModalLogout={onValueChangeModalLogout}
      />
    </>
  );
}
