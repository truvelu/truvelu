import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { convexQuery } from "@convex-dev/react-query";
import {
	Archive03Icon,
	ArrowRight01Icon,
	Delete02Icon,
	Edit03Icon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { useAction, usePaginatedQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
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
	const navigate = useNavigate();

	const editableRef = useRef<HTMLSpanElement | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [originalTitle, setOriginalTitle] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const updateChatTitle = useAction(api.chatAction.updateChatTitle);
	const archiveChat = useAction(api.chatAction.archiveChat);
	const deleteChat = useAction(api.chatAction.deleteChat);

	const startEditing = useCallback(() => {
		const el = editableRef.current;
		if (!el) return;
		if (!chat?._id) return;

		// Store original title for cancel
		setOriginalTitle(el.textContent ?? "");

		// Close dropdown first
		setDropdownOpen(false);

		// Delay to ensure dropdown menu closes and loses focus
		if (!editableRef.current) return;

		// Make element editable
		editableRef.current.role = "textbox";
		editableRef.current.tabIndex = 0;
		editableRef.current.contentEditable = "true";

		// Focus the element
		setTimeout(() => {
			if (!editableRef.current) return;
			editableRef.current.focus();

			// Select all text
			const range = document.createRange();
			range.selectNodeContents(editableRef.current);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
			setIsEditing(true);
		}, 200);

		// Set editing state after everything is set up
	}, [chat?._id]);

	const saveEdit = useCallback(() => {
		const el = editableRef.current;
		if (!el || !chat?._id) return;

		const newTitle = el.textContent?.trim() ?? "";

		// If empty or unchanged, revert to original
		if (!newTitle || newTitle === originalTitle) {
			el.textContent = originalTitle;
		} else if (newTitle !== originalTitle) {
			// Update title
			updateChatTitle({
				threadId: chat._id,
				title: newTitle,
			});
		}

		// Exit edit mode
		el.contentEditable = "false";
		el.removeAttribute("role");
		el.removeAttribute("tabIndex");
		setIsEditing(false);
	}, [chat?._id, originalTitle, updateChatTitle]);

	const cancelEdit = useCallback(() => {
		const el = editableRef.current;
		if (!el) return;

		// Revert to original title
		el.textContent = originalTitle;

		// Exit edit mode
		el.contentEditable = "false";
		el.removeAttribute("role");
		el.removeAttribute("tabIndex");
		setIsEditing(false);
	}, [originalTitle]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLSpanElement>) => {
			if (!isEditing) return;

			if (e.key === "Enter") {
				e.preventDefault();
				saveEdit();
			} else if (e.key === "Escape") {
				e.preventDefault();
				cancelEdit();
			}
		},
		[isEditing, saveEdit, cancelEdit],
	);

	const handleBlur = useCallback(() => {
		if (!isEditing) return;
		saveEdit();
	}, [isEditing, saveEdit]);

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				tooltip="Chat"
				className="cursor-pointer rounded-tlarge"
				onClick={(e) => {
					// Prevent navigation when editing
					if (isEditing) {
						e.preventDefault();
						e.stopPropagation();
						return;
					}
					navigate({
						to: "/c/{-$chatId}",
						params: {
							chatId: chat?.additionalData?.uuid ?? "",
						},
					});
				}}
			>
				<span
					ref={editableRef}
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
					className={isEditing ? "outline-none" : ""}
				>
					{chat?.title}
				</span>
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
							navigate({
								to: "/",
							})
								.then(() => {
									toast.success("Chat archived successfully");
								})
								.catch(() => {
									toast.error("Failed to archive chat");
								});
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
							navigate({
								to: "/",
							})
								.then(() => {
									toast.success("Chat deleted successfully");
								})
								.catch(() => {
									toast.error("Failed to delete chat");
								});
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
								<NavChatItem
									key={chat?.additionalData?.uuid ?? ""}
									chat={chat}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);
}
