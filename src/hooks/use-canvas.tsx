import { createCanvasFinder } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/zustand/canvas";
import { useShallow } from "zustand/react/shallow";
import { useGetRoomId } from "./use-get-room-id";

export function useCanvasList() {
	const roomId = useGetRoomId();
	const { canvasMap } = useCanvasStore(
		useShallow(({ canvasMap }) => ({ canvasMap })),
	);
	const finder = createCanvasFinder(canvasMap);
	const canvasList = finder.findByRoom(roomId);
	return canvasList;
}

export function useCanvasCount() {
	const canvasList = useCanvasList();
	return canvasList?.length ?? 0;
}

export function useCanvasOpenStatus() {
	const count = useCanvasCount();
	return count > 0;
}
