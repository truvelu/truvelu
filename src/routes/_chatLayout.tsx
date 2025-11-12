import AiCanvas from "@/components/shared/ai-canvas";
import { AppSidebar } from "@/components/shared/app-sidebar";
import Header from "@/components/shared/header";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useActiveCanvasId, useCanvasOpenStatus } from "@/hooks/use-canvas";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/zustand/canvas";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Authenticated } from "convex/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/_chatLayout")({
	component: ChatLayout,

	loader: async (context) => {
		// Public routes that don't require authentication
		const publicRoutes = ["/"] as const;
		const requiresAuth = !publicRoutes.includes(
			context.location.pathname as (typeof publicRoutes)[number],
		);

		if (requiresAuth && !context.context.userId) {
			throw redirect({
				to: "/auth",
			});
		}
	},
});

function ResponsiveLayout({ children }: { children: ReactNode }) {
	const roomId = useGetRoomId();
	const isMobile = useIsMobile();
	const openCanvas = useCanvasOpenStatus();
	const activeCanvasId = useActiveCanvasId();
	const { toggleCanvas, setActiveCanvasId, closeCanvas } = useCanvasStore(
		useShallow(({ toggleCanvas, setActiveCanvasId, closeCanvas }) => ({
			toggleCanvas,
			setActiveCanvasId,
			closeCanvas,
		})),
	);

	const rightPanelRef = useRef<ImperativePanelHandle>(null);

	const onOpenCanvas = useCallback(() => {
		if (!roomId) return;
		if (!activeCanvasId) {
			setActiveCanvasId(roomId, "list");
		}

		toggleCanvas(roomId);
	}, [roomId, activeCanvasId, setActiveCanvasId, toggleCanvas]);

	// Animate panel size based on canvasOpenedId
	useEffect(() => {
		if (isMobile) return;
		if (rightPanelRef.current) {
			if (!openCanvas) {
				rightPanelRef.current.collapse();
			} else {
				rightPanelRef.current.expand(50);
			}
		}
	}, [openCanvas, isMobile]);

	if (isMobile) {
		return (
			<>
				<Header />
				<div
					className={cn(
						"relative h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))]",
					)}
				>
					{children}

					<Drawer
						open={openCanvas}
						onOpenChange={() => {
							onOpenCanvas();
						}}
					>
						<DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[95svh]">
							<DrawerTitle />
							<DrawerDescription />
							<AiCanvas />
						</DrawerContent>
					</Drawer>
				</div>
			</>
		);
	}

	return (
		<ResizablePanelGroup id="resizable-panel-group" direction="horizontal">
			<ResizablePanel
				id="resizable-panel-left-panel"
				className={cn("relative h-svh lg:h-dvh")}
				defaultSize={openCanvas ? undefined : 100}
				minSize={50}
			>
				<Header />

				{children}
			</ResizablePanel>

			{openCanvas && (
				<ResizableHandle
					id="resizable-handle"
					withHandle
					className={cn(!openCanvas && "pointer-events-none")}
				/>
			)}

			<ResizablePanel
				ref={rightPanelRef}
				id="resizable-panel-right-panel"
				collapsible
				onCollapse={() => {
					closeCanvas(roomId);
				}}
				defaultSize={openCanvas ? undefined : 0}
				minSize={35}
				className={cn(
					"flex flex-col relative h-svh lg:h-dvh transition-all duration-100 ease-in-out overflow-hidden",
					"shadow-[0_0_18px_rgba(0,0,0,0.12)] dark:shadow-[0_0_18px_rgba(0,0,0,0.48)] z-30",
					openCanvas ? "opacity-100" : "opacity-0",
				)}
			>
				<AiCanvas />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function ChatLayout() {
	return (
		<>
			<SidebarProvider defaultOpen={false}>
				<Authenticated>
					<AppSidebar />
				</Authenticated>
				<SidebarInset className="overflow-x-hidden">
					<ResponsiveLayout>
						<Outlet />
					</ResponsiveLayout>
				</SidebarInset>
			</SidebarProvider>
		</>
	);
}
