/**
 * Example usage of external CanvasFinder utilities
 * This demonstrates how to use the finder functions outside of the Zustand store
 */

import { createCanvasFinder } from "@/lib/canvas.utils";
import { type CanvasPayload, useCanvasStore } from "@/zustand/canvas";
import { CanvasType } from "@/zustand/canvas";

// Example 1: Using finder with store state
export function useCanvasFinder() {
	const canvasMap = useCanvasStore((state) => state.canvasMap);
	const finder = createCanvasFinder(canvasMap);

	return finder;
}

// Example 2: Custom hook for specific canvas queries
export function useCanvasByRoom(roomId: string) {
	const canvasMap = useCanvasStore((state) => state.canvasMap);
	const finder = createCanvasFinder(canvasMap);

	return finder.findByRoom(roomId);
}

// Example 3: Custom hook for canvas existence check
export function useCanvasExists(
	type: CanvasType,
	roomId: string,
	threadId: string,
) {
	const canvasMap = useCanvasStore((state) => state.canvasMap);
	const finder = createCanvasFinder(canvasMap);

	return finder.exists(type, roomId, threadId);
}

// Example 4: Direct usage in components
export function MyComponent() {
	const canvasMap = useCanvasStore((state) => state.canvasMap);
	const finder = createCanvasFinder(canvasMap);

	// Find all canvas items
	const allCanvas = finder.findAll();

	// Find canvas by specific criteria
	const contentCanvas = finder.findByTypeAndRoom(
		CanvasType.CONTENT,
		"room-123",
	);

	// Check if canvas exists
	const exists = finder.exists(CanvasType.THREAD, "room-123", "thread-456");

	// Get count
	const count = finder.getCount();

	return {
		allCanvas,
		contentCanvas,
		exists,
		count,
	};
}

// Example 5: Using with external canvasMap (not from store)
export function processExternalCanvasMap(
	externalCanvasMap: Map<string, Map<string, CanvasPayload>>,
) {
	const finder = createCanvasFinder(externalCanvasMap);

	// All finder methods work the same way
	return {
		allItems: finder.findAll(),
		count: finder.getCount(),
		// ... other operations
	};
}
