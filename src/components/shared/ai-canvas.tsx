import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Response } from "../ai-elements/response";
import { MATH_MARKDOWN } from "@/constants/messages";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import { useShallow } from "zustand/react/shallow";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerTitle } from "../ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useCanvasList } from "@/hooks/use-canvas";
import {
  Cancel01Icon,
  Comment02Icon,
  File01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import SharedIcon from "./shared-icon";
import AiConversation from "./ai-conversation";
import { Button } from "../ui/button";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { ContainerWithMargin, ContainerWithMaxWidth } from "./container";

const AiCanvasHeaderResponsive = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <DrawerTitle>{children}</DrawerTitle>;
  }
  return <>{children}</>;
};

const AiCanvasHeader = memo(({ children }: { children: React.ReactNode }) => {
  return (
    <AiCanvasHeaderResponsive>
      <div
        className={cn(
          "flex items-center gap-1 h-header px-1 bg-white w-full justify-between"
        )}
      >
        <div className="flex-1 w-[calc(100%-9.5rem)]">{children}</div>

        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer rounded-md"
        >
          <SharedIcon icon={MoreHorizontalIcon} />
        </Button>
      </div>
    </AiCanvasHeaderResponsive>
  );
});

const AiCanvas = () => {
  const isMobile = useIsMobile();
  const canvasList = useCanvasList();
  const { activeCanvasId, setActiveCanvasId, removeCanvas } = useCanvasStore(
    useShallow(({ activeCanvasId, setActiveCanvasId, removeCanvas }) => ({
      activeCanvasId,
      setActiveCanvasId,
      removeCanvas,
    }))
  );

  const [isHovered, setIsHovered] = useState<string>("");

  const typeMap = {
    [CanvasType.CONTENT]: { icon: File01Icon },
    [CanvasType.THREAD]: { icon: Comment02Icon },
  };

  const componentMapper = (type: CanvasType) => {
    switch (type) {
      case CanvasType.CONTENT:
        return (
          <ContainerWithMargin>
            <ContainerWithMaxWidth className="w-full">
              <Response>{MATH_MARKDOWN}</Response>
            </ContainerWithMaxWidth>
          </ContainerWithMargin>
        );
      case CanvasType.THREAD:
        return <AiConversation />;
      default:
        return null;
    }
  };

  const canvasTabs = canvasList.map((canvas) => {
    return {
      ...canvas,
      icon: typeMap[canvas.type]?.icon,
      component: componentMapper(canvas.type),
    };
  });

  const lastCanvas = canvasList[canvasList.length - 1];

  useEffect(() => {
    setActiveCanvasId(lastCanvas?.id);
  }, [lastCanvas]);

  return (
    <Tabs
      value={activeCanvasId}
      onValueChange={setActiveCanvasId}
      className="gap-0"
    >
      <AiCanvasHeader>
        <ScrollArea className="w-full p-0">
          <TabsList className="bg-transparent">
            {canvasTabs?.map((trigger) => (
              <div
                key={trigger.id}
                className="relative"
                onMouseEnter={() => {
                  if (isMobile) return;
                  setIsHovered(trigger.id);
                }}
                onMouseLeave={() => {
                  if (isMobile) return;
                  setIsHovered("");
                }}
              >
                <TabsTrigger
                  value={trigger.id}
                  className={cn(
                    "cursor-pointer data-[state=active]:border data-[state=active]:border-ring",
                    "pl-1 pr-8"
                  )}
                >
                  <SharedIcon icon={trigger.icon} />
                </TabsTrigger>
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 right-1 rounded-full p-1 size-fit cursor-pointer transition-opacity",
                    isMobile || isHovered === trigger.id
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                  onClick={() =>
                    removeCanvas({
                      type: trigger.type,
                      threadId: trigger.data?.threadId,
                      roomId: trigger.data?.roomId,
                    })
                  }
                >
                  <SharedIcon icon={Cancel01Icon} className="size-3" />
                </Button>
              </div>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </AiCanvasHeader>
      {canvasTabs.map((canvas) => (
        <TabsContent key={canvas.id} value={canvas.id}>
          <div>{canvas.component}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default AiCanvas;
