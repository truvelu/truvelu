import AiCanvas from "@/components/shared/ai-canvas";
import { AppSidebar } from "@/components/shared/app-sidebar";
import Header from "@/components/shared/header";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
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
  const isMobile = useIsMobile();
  const { setPretendIsMobile } = useSidebar();
  const { open, closeCanvas, canvas, canvasMap } = useCanvasStore(
    useShallow(({ open, closeCanvas, canvas, canvasMap }) => ({
      open,
      closeCanvas,
      canvas,
      canvasMap,
    }))
  );

  console.log({ open, canvas, canvasMap });

  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const onCloseCanvas = () => {
    closeCanvas();
    setPretendIsMobile(false);
  };

  // Animate panel size based on canvasOpenedId
  useEffect(() => {
    if (rightPanelRef.current) {
      if (!open) {
        rightPanelRef.current.collapse();
      } else {
        rightPanelRef.current.expand();
      }
    }
  }, [open]);

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
            open={open}
            onOpenChange={(open) => {
              if (!open) {
                onCloseCanvas();
              }
            }}
          >
            <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[90vh]">
              <AiCanvas onCloseCanvas={onCloseCanvas} />
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
        defaultSize={65}
        minSize={35}
      >
        <Header />

        {children}
      </ResizablePanel>

      <ResizableHandle
        id="resizable-handle"
        withHandle
        className={cn(!open && "pointer-events-none opacity-0")}
      />

      <ResizablePanel
        ref={rightPanelRef}
        id="resizable-panel-right-panel"
        defaultSize={open ? 35 : 0}
        collapsible
        minSize={35}
        className={cn(
          "flex flex-col relative h-svh lg:h-dvh pb-3 transition-all duration-75 ease-in-out overflow-hidden",
          "shadow-[0_0_18px_rgba(0,0,0,0.12)] dark:shadow-[0_0_18px_rgba(0,0,0,0.48)] z-30"
        )}
        onCollapse={() => {
          onCloseCanvas();
        }}
      >
        <AiCanvas onCloseCanvas={onCloseCanvas} />
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
