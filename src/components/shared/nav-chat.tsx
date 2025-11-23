import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useEditableTitle } from "@/hooks/use-editable-title";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { createArrayMock } from "@/lib/array-utils";
import { useConvexPaginatedQuery } from "@convex-dev/react-query";
import {
	Archive03Icon,
	ArrowRight01Icon,
	Delete02Icon,
	Edit03Icon,
	GridIcon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { AuthLoading, Authenticated, useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../provider/auth-provider";
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
import { Skeleton } from "../ui/skeleton";
import SharedIcon from "./shared-icon";

const NavChatItem = ({
	chat,
}: {
	chat: (typeof api.chat.queries.getChats._returnType)["page"][number];
}) => {
	const roomId = useGetRoomId();
	const navigate = useNavigate();

	const [dropdownOpen, setDropdownOpen] = useState(false);

	const updateChatTitle = useAction(api.chat.actions.updateChatTitle);
	const archiveChat = useAction(api.chat.actions.archiveChat);
	const deleteChat = useAction(api.chat.actions.deleteChat);

	const { editableRef, isEditing, startEditing, handleKeyDown, handleBlur } =
		useEditableTitle({
			onSave: (newTitle) => {
				if (!chat?._id) return;
				updateChatTitle({
					threadId: chat._id,
					title: newTitle,
				});
			},
			onStartEdit: () => {
				// Close dropdown when starting to edit
				setDropdownOpen(false);
			},
		});

	return (
		<SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
			<SidebarMenuButton
				tooltip={chat?.title}
				className="cursor-pointer rounded-tlarge py-0"
				onClick={(e) => {
					// Prevent navigation when editing
					if (isEditing) {
						e.preventDefault();
						e.stopPropagation();
						return;
					}
				}}
				asChild
			>
				<Link
					to={"/c/{-$chatId}"}
					params={{ chatId: chat?.data?.uuid ?? "" }}
					activeProps={{
						className: "bg-sidebar-accent",
						onClick: (e) => {
							e.preventDefault();
							e.stopPropagation();
							return false;
						},
					}}
				>
					<SharedIcon icon={GridIcon} />
					<span
						ref={editableRef}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						className={isEditing ? "outline-none" : ""}
					>
						{chat?.title}
					</span>
				</Link>
			</SidebarMenuButton>
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
					<DropdownMenuItem className="p-2.5 rounded-xl" onClick={startEditing}>
						<SharedIcon icon={Edit03Icon} />
						<span>Rename</span>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						className="p-2.5 rounded-xl"
						onClick={() => {
							if (!chat?._id) return;
							archiveChat({ threadId: chat._id });

							if (roomId === chat?.data?.uuid) {
								navigate({
									to: "/",
								})
									.then(() => {
										toast.success("Chat archived successfully");
									})
									.catch(() => {
										toast.error("Failed to archive chat");
									});
								return;
							}

							toast.success("Chat archived successfully");
						}}
					>
						<SharedIcon icon={Archive03Icon} />
						<span>Archive</span>
					</DropdownMenuItem>

					<DropdownMenuItem
						className="text-destructive! p-2.5 rounded-xl"
						onClick={() => {
							if (!chat?._id) return;
							deleteChat({ threadId: chat._id });
							if (roomId === chat?.data?.uuid) {
								navigate({
									to: "/",
								})
									.then(() => {
										toast.success("Chat delete successfully");
									})
									.catch(() => {
										toast.error("Failed to delete chat");
									});
								return;
							}

							toast.success("Chat deleted successfully");
						}}
					>
						<SharedIcon icon={Delete02Icon} className="text-destructive" />
						<span>Delete</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
};

function NavChatItemSkeleton({ length = 10 }: { length?: number }) {
	return createArrayMock(length).map((index) => (
		<div key={index} className="h-8 px-1.5 w-full gap-2 flex items-center">
			<Skeleton className="min-h-5 min-w-5 max-h-5 max-w-5 rounded-sm" />
			<Skeleton className="h-5 w-full rounded-sm" />
		</div>
	));
}

function NavChatSkeleton({ length = 10 }: { length?: number }) {
	return (
		<div className="flex flex-col gap-1 p-2">
			<div className="h-8 px-2 w-full flex items-center gap-1">
				<Skeleton className="h-5 w-9 rounded-sm" />
				<Skeleton className="min-h-5 min-w-5 max-h-5 max-w-5 rounded-sm" />
			</div>
			<NavChatItemSkeleton length={length} />
		</div>
	);
}

export function NavChat() {
	const { userId } = useAuth();
	const { state } = useSidebar();

	const { results: chats, status } = useConvexPaginatedQuery(
		api.chat.queries.getChats,
		{
			userId,
		},
		{ initialNumItems: 20 },
	);

	if (status === "LoadingFirstPage" && state === "expanded") {
		return <NavChatSkeleton length={20} />;
	}

	return (
		<>
			<Authenticated>
				{!!chats?.length && (
					<Collapsible defaultOpen className="group/collapsible">
						<SidebarGroup className="group-data-[collapsible=icon]:opacity-0">
							<SidebarGroupLabel asChild>
								<CollapsibleTrigger className="gap-1 cursor-pointer group-data-[collapsible=icon]:hidden">
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
										{chats?.map((chat) => (
											<NavChatItem key={chat?.data?.uuid ?? ""} chat={chat} />
										))}
										{status === "LoadingMore" && (
											<NavChatItemSkeleton length={20} />
										)}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				)}
			</Authenticated>
			<AuthLoading>
				{state === "expanded" && <NavChatSkeleton length={20} />}
			</AuthLoading>
		</>
	);
}
