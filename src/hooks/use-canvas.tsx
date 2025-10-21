import { createCanvasFinder } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/zustand/canvas";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGetRoomId } from "./use-get-room-id";

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
