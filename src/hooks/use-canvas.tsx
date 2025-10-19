import { useCanvasStore } from "@/zustand/canvas";
import { useGetRoomId } from "./use-get-room-id";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";

export function useCanvasCount() {
  const roomId = useGetRoomId();
  const canvas = useCanvasStore(useShallow((state) => state.canvas));
  const canvasCount = useMemo(
    () => canvas?.filter((item) => item.data?.roomId === roomId).length,
    [canvas, roomId]
  );
  return canvasCount;
}

export function useCanvasOpenStatus() {
  const count = useCanvasCount();
  return useMemo(() => count > 0, [count]);
}
