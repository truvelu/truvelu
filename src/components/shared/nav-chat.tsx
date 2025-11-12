import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useEditableTitle } from "@/hooks/use-editable-title";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { convexQuery } from "@convex-dev/react-query";
import {
	Archive03Icon,
	ArrowRight01Icon,
	Delete02Icon,
	Edit03Icon,
	GridIcon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useAction, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
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

const NavChatItem = ({
	chat,
}: { chat: (typeof api.chat.getChats._returnType)["page"][number] }) => {
	const roomId = useGetRoomId();
	const navigate = useNavigate();

	const [dropdownOpen, setDropdownOpen] = useState(false);

	const updateChatTitle = useAction(api.chatAction.updateChatTitle);
	const archiveChat = useAction(api.chatAction.archiveChat);
	const deleteChat = useAction(api.chatAction.deleteChat);

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
		<SidebarMenuItem>
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
							return;
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
						className="!text-destructive p-2.5 rounded-xl"
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

export function NavChat() {
	const { data: user } = useQuery(convexQuery(api.auth.getCurrentUser, {}));
	const { results: chats } = usePaginatedQuery(
		api.chat.getChats,
		user?._id?.toString()
			? {
					userId: user?._id?.toString() ?? "",
				}
			: "skip",
		{ initialNumItems: 20 },
	);

	if (!chats?.length) return null;

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
							{chats?.map((chat) => (
								<NavChatItem key={chat?.data?.uuid ?? ""} chat={chat} />
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);
}
