import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { memo } from "react";
import { Button } from "../ui/button";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";

export const Header = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
	const navigate = useNavigate();
	const { isMobile } = useSidebar();

	return (
		<div
			className={cn(
				"sticky top-0 z-10 h-header bg-white flex items-center border-b border-sidebar-border p-2.5",
				!isAuthenticated && "justify-end",
			)}
		>
			{isMobile && <SidebarTrigger className="p-2 cursor-pointer" />}
			{!isAuthenticated && (
				<Button
					onClick={() => {
						navigate({ to: "/auth" });
					}}
					className="rounded-tlarge px-3 h-9 cursor-pointer"
				>
					Log in
				</Button>
			)}
		</div>
	);
};

export default memo(Header);
