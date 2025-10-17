import { memo } from "react";
import CloseButton from "./close-button";
import { cn } from "@/lib/utils";
import { Response } from "../ai-elements/response";
import { MESSAGES } from "@/constants/messages";
import { CanvasType, useCanvasStore } from "@/zustand/canvas";
import { useShallow } from "zustand/react/shallow";
import { useGetRoomId } from "@/hooks/use-get-room-id";

const AiCanvas = memo(({ onCloseCanvas }: { onCloseCanvas: () => void }) => {
  const roomId = useGetRoomId();
  const getCanvasByRoomId = useCanvasStore(
    useShallow((state) => state.getCanvasByRoomId)
  );

  const selectedContent = getCanvasByRoomId(roomId ?? "")?.find(
    (canvas) => canvas.type === CanvasType.CONTENT
  );

  const canvasOpenedMessageList =
    MESSAGES.find((message) => message.id === selectedContent?.data?.threadId)
      ?.parts?.map((part) => part.canvas)
      ?.flat()
      ?.filter((part) => part !== undefined) ?? [];
  const canvasOpenedMessage = canvasOpenedMessageList[0];

  return (
    <>
      <div className="flex items-center gap-1 h-header px-2 bg-white">
        <CloseButton
          buttonProps={{
            onClick: () => onCloseCanvas(),
          }}
        />

        <div>
          <h1 className="text-base pl-3 pr-2">{canvasOpenedMessage?.title}</h1>
        </div>
      </div>
      <div
        className={cn(
          "flex-1 h-full overflow-y-auto pt-3",
          "[--thread-content-margin:--spacing(4)] sm:[--thread-content-margin:--spacing(6)] px-(--thread-content-margin)"
        )}
      >
        {canvasOpenedMessage?.value && (
          <Response>{canvasOpenedMessage?.value}</Response>
        )}
      </div>
    </>
  );
});

AiCanvas.displayName = "AiCanvas";

export default AiCanvas;
