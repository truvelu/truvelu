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
import { useCanvasOpenStatus } from "@/hooks/use-canvas";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/zustand/canvas";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ReactNode, useEffect, useRef } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";

export const Route = createFileRoute("/_chatLayout")({
  component: ChatLayout,
});

function ResponsiveLayout({ children }: { children: ReactNode }) {
  const roomId = useGetRoomId();
  const isMobile = useIsMobile();
  const closeCanvas = useCanvasStore(useShallow((state) => state.closeCanvas));
  const openCanvas = useCanvasOpenStatus();

  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // Animate panel size based on canvasOpenedId
  useEffect(() => {
    if (rightPanelRef.current) {
      if (!openCanvas) {
        rightPanelRef.current.collapse();
      } else {
        rightPanelRef.current.expand();
      }
    }
  }, [openCanvas]);

  if (isMobile) {
    return (
      <>
        <Header />
        <div
          className={cn(
            "relative h-[calc(100svh-var(--spacing-header))] lg:h-[calc(100lvh-var(--spacing-header))]"
          )}
        >
          {children}

          <Drawer
            open={openCanvas}
            onOpenChange={(open) => {
              if (!open) {
                closeCanvas(roomId);
              }
            }}
          >
            <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90vh]">
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
        defaultSize={50}
        minSize={35}
      >
        <Header />

        {children}
      </ResizablePanel>

      <ResizableHandle
        id="resizable-handle"
        withHandle
        className={cn(!openCanvas && "pointer-events-none opacity-0")}
      />

      <ResizablePanel
        ref={rightPanelRef}
        id="resizable-panel-right-panel"
        defaultSize={openCanvas ? 50 : 0}
        collapsible
        minSize={35}
        className={cn(
          "flex flex-col relative h-svh lg:h-dvh pb-3 transition-all duration-75 ease-in-out overflow-hidden",
          "shadow-[0_0_18px_rgba(0,0,0,0.12)] dark:shadow-[0_0_18px_rgba(0,0,0,0.48)] z-30"
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
        <AppSidebar />
        <SidebarInset className="overflow-x-hidden">
          <ResponsiveLayout>
            <Outlet />
          </ResponsiveLayout>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
