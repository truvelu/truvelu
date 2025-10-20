import { createCanvasFinder, useCanvasStore } from "@/zustand/canvas";
import { useGetRoomId } from "./use-get-room-id";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";

export function useCanvasList() {
  const roomId = useGetRoomId();
  const canvasMap = useCanvasStore(useShallow((state) => state.canvasMap));
  const finder = createCanvasFinder(canvasMap ?? new Map());
  const canvasList = useMemo(() => finder.findByRoom(roomId), [finder, roomId]);
  return canvasList;
}

export function useCanvasCount() {
  const canvasList = useCanvasList();
  return useMemo(() => canvasList?.length, [canvasList]);
}

export function useCanvasOpenStatus() {
  const count = useCanvasCount();
  return useMemo(() => count > 0, [count]);
}
