import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { convexQuery } from "@convex-dev/react-query";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { Suspense } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import SharedIcon from "./shared-icon";

const NavChatItem = ({
	chat,
}: { chat: (typeof api.chat.getChats._returnType)["page"][number] }) => {
	const navigate = useNavigate();

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				tooltip="Chat"
				className="cursor-pointer rounded-tlarge"
				onClick={() => {
					navigate({
						to: "/c/{-$chatId}",
						params: {
							chatId: chat?.additionalData?.uuid ?? "",
						},
					});
				}}
			>
				<span>{chat?.title}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
};

export function NavChat() {
	const { data: user } = useSuspenseQuery(
		convexQuery(api.auth.getCurrentUser, {}),
	);
	const { results: chats } = usePaginatedQuery(
		api.chat.getChats,
		{
			userId: user?._id?.toString() ?? "",
		},
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
							<Suspense fallback={<div>Loading...</div>}>
								{chats?.map((chat) => (
									<NavChatItem
										key={chat?.additionalData?.uuid ?? ""}
										chat={chat}
									/>
								))}
							</Suspense>
						</SidebarMenu>
					</SidebarGroupContent>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);
}
