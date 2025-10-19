import { memo } from "react";
import CloseButton from "./close-button";
import { cn } from "@/lib/utils";
import { Response } from "../ai-elements/response";
import { MESSAGES, MessageType } from "@/constants/messages";
import { useCanvasStore } from "@/zustand/canvas";
import { useShallow } from "zustand/react/shallow";
import { useGetRoomId } from "@/hooks/use-get-room-id";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerTitle } from "../ui/drawer";

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

const AiCanvasHeader = memo(({ title }: { title: string }) => {
  const roomId = useGetRoomId();
  const { clearCanvas } = useCanvasStore(
    useShallow(({ clearCanvas }) => ({ clearCanvas }))
  );

  return (
    <AiCanvasHeaderResponsive>
      <div className="flex items-center gap-1 h-header px-2 bg-white">
        <CloseButton
          buttonProps={{
            onClick: () => clearCanvas(roomId),
          }}
        />

        <div>
          <h1 className="text-base pl-3 pr-2">{title}</h1>
        </div>
      </div>
    </AiCanvasHeaderResponsive>
  );
});

const AiCanvas = () => {
  const roomId = useGetRoomId();
  const { getCanvas } = useCanvasStore(
    useShallow(({ getCanvas }) => ({ getCanvas }))
  );

  const canvasList = getCanvas({
    roomId,
  });
  const canvasOpenedMessage = canvasList[0]?.data?.threadId ?? "";
  const messageFinder = MESSAGES.find(
    (message) => message.id === canvasOpenedMessage
  );
  const messagePartCanvas = messageFinder?.parts?.find(
    (part) => part.type === MessageType.CANVAS
  );

  return (
    <>
      <AiCanvasHeader title={messagePartCanvas?.title ?? ""} />
      <div
        className={cn(
          "flex-1 h-full overflow-y-auto pt-3",
          "[--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(6)] px-(--thread-content-margin)"
        )}
      >
        {messagePartCanvas?.value && (
          <Response>{messagePartCanvas?.value}</Response>
        )}
      </div>
    </>
  );
};

export default AiCanvas;
