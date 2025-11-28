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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { convexQuery } from "@convex-dev/react-query";
import {
	Cancel01Icon,
	LoginSquare02Icon,
	Logout05Icon,
	Settings02Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { memo, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ModeToggle } from "./mode-toggle";
import SharedIcon from "./shared-icon";
import SignInButton from "./sign-in-button";
import SignOutButton from "./sign-out-button";

const ModalNavUserLogout = ({
	isOpenModalLogout,
	onValueChangeModalLogout,
}: {
	isOpenModalLogout: boolean;
	onValueChangeModalLogout: (open: boolean) => void;
}) => {
	const { data } = useQuery(convexQuery(api.auth.getCurrentUser, {}));

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
					<p className="text-xl text-center text-secondary-foreground/50 pt-4 pb-6">
						Log out of Platform as {data?.email}?
					</p>
					<div className="flex flex-col gap-4">
						<SignOutButton asChild>
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

const ModalNavUserSettings = ({
	isOpenModalSettings,
	onValueChangeModalSettings,
}: {
	isOpenModalSettings: boolean;
	onValueChangeModalSettings: (open: boolean) => void;
}) => {
	const isMobile = useIsMobile();

	return (
		<Dialog
			open={isOpenModalSettings}
			onOpenChange={onValueChangeModalSettings}
		>
			<DialogContent
				className="gap-0 col-auto col-start-2 row-auto row-start-2 h-full w-full text-start rounded-2xl flex flex-col focus:outline-hidden overflow-hidden max-h-[85vh] max-md:min-h-[60vh] md:h-[600px] md:max-w-[680px] p-0"
				showCloseButton={false}
			>
				<DialogHeader className="flex-row h-header md:hidden p-2.5 pl-4 text-base items-center justify-between border-b border-border">
					<DialogTitle className="text-left font-normal">Settings</DialogTitle>

					<Button
						variant="ghost"
						size="icon"
						className="rounded-lg cursor-pointer hover:bg-accent-foreground/10"
						onClick={() => onValueChangeModalSettings(false)}
					>
						<SharedIcon icon={Cancel01Icon} />
					</Button>
				</DialogHeader>

				<div className="grow overflow-y-auto">
					<Tabs
						defaultValue="general"
						className="flex md:h-full flex-col md:flex-row gap-0"
						orientation={isMobile ? "horizontal" : "vertical"}
					>
						<TabsList className="p-0 flex flex-1 h-full justify-start flex-row flex-wrap select-none max-md:overflow-x-auto max-md:border-b max-md:p-1.5 md:max-w-[210px] md:min-w-[180px] md:flex-col rounded-none w-full border-0 bg-accent border-border">
							<div className="py-3 px-2.5 max-md:hidden w-full">
								<Button
									variant="ghost"
									size="icon"
									className="rounded-lg cursor-pointer hover:bg-accent-foreground/10"
									onClick={() => onValueChangeModalSettings(false)}
								>
									<SharedIcon icon={Cancel01Icon} />
								</Button>
							</div>

							<TabsTrigger
								value="general"
								className="flex-none w-auto md:w-[calc(100%-1.25rem)] h-9 bg-primary-foreground shadow-none! border-none font-normal flex gap-1.5 justify-start"
							>
								<SharedIcon icon={Settings02Icon} className="size-5" />
								General
							</TabsTrigger>
						</TabsList>
						<TabsContent
							value="general"
							className="relative flex w-full flex-col overflow-y-auto px-4 text-sm max-md:max-h-[calc(100vh-150px)] md:min-h-[380px]"
						>
							<div className="py-3 border-b border-border">
								<h3 className="w-full text-lg font-normal">General</h3>
							</div>

							<div className="h-14 border-b border-border w-full flex items-center justify-between">
								<h4 className="w-full text-sm font-normal">Appearance</h4>

								<ModeToggle />
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const NavAvatar = ({
	className,
	avatarClassName,
}: { className?: string; avatarClassName?: string }) => {
	const { data } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const userInitialName = data?.name
		?.split(" ")
		?.map((name) => name[0]?.toUpperCase())
		?.slice(0, 2)
		?.join("");
	return (
		<div
			className={cn("flex items-center justify-center rounded-lg", className)}
		>
			<Avatar className={cn("size-6 rounded-full", avatarClassName)}>
				<AvatarImage src={data?.image ?? ""} alt={data?.name ?? ""} />
				<AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
					{userInitialName}
				</AvatarFallback>
			</Avatar>
		</div>
	);
};

function NavUser() {
	const { state, openMobile } = useSidebar();
	const isMobile = useIsMobile();

	const { data } = useQuery(convexQuery(api.auth.getCurrentUser, {}));

	const [isOpenModalLogout, setIsOpenModalLogout] = useState(false);
	const [isOpenModalSettings, setIsOpenModalSettings] = useState(false);

	const onValueChangeModalLogout = (open: boolean) => {
		setIsOpenModalLogout(open);
	};

	const onValueChangeModalSettings = (open: boolean) => {
		setIsOpenModalSettings(open);
	};

	return (
		<>
			<Authenticated>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className={cn(
										"group py-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
										state === "collapsed" ? "rounded-full!" : "rounded-lg!",
									)}
								>
									<NavAvatar className="group-data-[collapsible=icon]:min-w-9 group-data-[collapsible=icon]:min-h-9" />

									<div className="grid flex-1 text-left leading-tight">
										<span className="truncate text-sm">{data?.name}</span>
										<span className="truncate text-xs text-muted-foreground">
											Free
										</span>
									</div>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl py-1.5 px-0"
								side={
									state === "expanded" || (isMobile && openMobile)
										? "top"
										: "right"
								}
								align={
									state === "expanded" || (isMobile && openMobile)
										? "center"
										: "end"
								}
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal mx-2.5">
									<div className="flex items-center gap-2 pl-2.5 pr-8 py-1.5 text-left text-sm">
										<NavAvatar avatarClassName="size-5" />

										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">{data?.name}</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="mx-4 my-1" />
								<DropdownMenuGroup>
									<DropdownMenuItem
										onClick={() => onValueChangeModalSettings(true)}
										className="pl-2.5 pr-8 h-9 flex items-center cursor-pointer mx-2.5 gap-1.5 text-primary"
									>
										<SharedIcon
											icon={Settings02Icon}
											className="size-5 text-primary"
										/>
										Settings
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator className="mx-4 my-1" />

								<DropdownMenuItem
									onClick={() => onValueChangeModalLogout(true)}
									className="w-full rounded-tmedium cursor-pointer pl-2.5 pr-8 h-9 flex items-center mx-2.5 gap-1.5 text-primary"
								>
									<SharedIcon
										icon={Logout05Icon}
										className="size-5 text-primary"
									/>
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
				<ModalNavUserSettings
					isOpenModalSettings={isOpenModalSettings}
					onValueChangeModalSettings={onValueChangeModalSettings}
				/>
			</Authenticated>
			<Unauthenticated>
				{state === "collapsed" ? (
					<SignInButton>
						<SidebarMenuButton
							size="lg"
							className="group py-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							asChild
						>
							<Button variant="default" className="size-9 rounded-full">
								<SharedIcon icon={LoginSquare02Icon} />
							</Button>
						</SidebarMenuButton>
					</SignInButton>
				) : (
					<Button
						className="rounded-tlarge px-3 h-9 cursor-pointer gap-2"
						asChild
					>
						<Link to="/auth">
							<SharedIcon icon={LoginSquare02Icon} />
							<span>Log in</span>
						</Link>
					</Button>
				)}
			</Unauthenticated>
			<AuthLoading>
				{state === "collapsed" ? (
					<Skeleton className="rounded-full size-9" />
				) : (
					<Skeleton className="rounded-tlarge h-9 w-full" />
				)}
			</AuthLoading>
		</>
	);
}

export default memo(NavUser);
