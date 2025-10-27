import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Unauthenticated, useConvexAuth } from "convex/react";
import { memo } from "react";
import { Button } from "../ui/button";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";

export const Header = () => {
	const { isMobile } = useSidebar();
	const { isAuthenticated } = useConvexAuth();

	return (
		<div
			className={cn(
				"sticky top-0 z-10 h-header bg-white flex items-center border-b border-sidebar-border p-2.5",
				!isAuthenticated && "justify-end",
			)}
		>
			{isMobile && <SidebarTrigger className="p-2 cursor-pointer" />}
			<Unauthenticated>
				<Button className="rounded-tlarge px-3 h-9 cursor-pointer" asChild>
					<Link to="/auth">Log in</Link>
				</Button>
			</Unauthenticated>
		</div>
	);
};

export default memo(Header);
