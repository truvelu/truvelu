import type { CanvasPayload, CanvasType } from "@/zustand/canvas";

/**
 * Creates composite key for canvas lookup
 * Only creates the composite key: type_{type}:room_{roomId}:thread_{threadId}
 */
export function compositeKeyCreator(payload: CanvasPayload): string;
export function compositeKeyCreator(
	type: CanvasType,
	roomId: string,
	threadId: string,
): string;
export function compositeKeyCreator(
	payloadOrType: CanvasPayload | CanvasType,
	roomId?: string,
	threadId?: string,
): string {
	// Overload 1: Called with payload
	if (typeof payloadOrType === "object") {
		const { type, data } = payloadOrType;

		if (data?.roomId && data?.threadId) {
			return `type_${type}:room_${data.roomId}:thread_${data.threadId}`;
		}

		throw new Error("Canvas payload must have roomId and threadId");
	}

	// Overload 2: Called with individual parameters
	if (roomId && threadId) {
		return `type_${payloadOrType}:room_${roomId}:thread_${threadId}`;
	}

	throw new Error("compositeKeyCreator requires roomId and threadId");
}

/**
 * Pattern creators for canvas lookup
 */
export const patternCreators = {
	/**
	 * Creates a pattern to match all canvas items for a specific roomId
	 * Matches format: :room_{roomId}:
	 */
	byRoom: (roomId: string) => new RegExp(`:room_${roomId}:`),

	/**
	 * Creates a pattern to match all canvas items for a specific threadId
	 * Matches format: :thread_{threadId}$
	 */
	byThread: (threadId: string) => new RegExp(`:thread_${threadId}$`),

	/**
	 * Creates a pattern to match all canvas items for a specific type and roomId
	 * Matches format: ^type_{type}:room_{roomId}:
	 */
	byTypeAndRoom: (type: CanvasType, roomId: string) =>
		new RegExp(`^type_${type}:room_${roomId}:`),

	/**
	 * Creates a pattern to match all canvas items for a specific type and threadId
	 * Matches format: ^type_{type}:room_{any}:thread_{threadId}$
	 */
	byTypeAndThread: (type: CanvasType, threadId: string) =>
		new RegExp(`^type_${type}:room_[^:]+:thread_${threadId}$`),

	/**
	 * Creates a pattern to match all canvas items for a specific roomId and threadId
	 * Matches format: ^type_{any}:room_{roomId}:thread_{threadId}$
	 */
	byRoomAndThread: (roomId: string, threadId: string) =>
		new RegExp(`^type_[^:]+:room_${roomId}:thread_${threadId}$`),
};

/**
 * Extracts type, roomId, and threadId from a composite key
 * Parses the composite key format: type_{type}:room_{roomId}:thread_{threadId}
 */
export function compositeKeyExtractor(compositeKey: string): {
	type: CanvasType;
	roomId: string;
	threadId: string;
} | null {
	const pattern = /^type_([^:]+):room_([^:]+):thread_(.+)$/;
	const match = compositeKey.match(pattern);

	if (!match) {
		return null;
	}

	const [, type, roomId, threadId] = match;
	return {
		type: type as CanvasType,
		roomId,
		threadId,
	};
}

/**
 * Helper function to find canvases by pattern
 * Reduces redundancy in CanvasFinder methods
 */
function findByPattern(
	canvasMap: Map<string, Map<string, CanvasPayload>>,
	pattern: RegExp,
): CanvasPayload[] {
	const matchingCanvas: CanvasPayload[] = [];

	for (const [key, innerMap] of canvasMap) {
		if (pattern.test(key)) {
			for (const canvas of innerMap.values()) {
				matchingCanvas.push(canvas);
			}
		}
	}

	return matchingCanvas;
}

/**
 * Helper function to find the first canvas ID for a specific room
 * Used to determine active canvas after removals
 */
export function findFirstCanvasIdInRoom(
	canvasMap: Map<string, Map<string, CanvasPayload>>,
	roomId: string,
): string | undefined {
	const pattern = patternCreators.byRoom(roomId);

	for (const [key, innerMap] of canvasMap) {
		if (pattern.test(key)) {
			const firstCanvas = innerMap.values().next().value;
			if (firstCanvas) {
				return firstCanvas.id;
			}
		}
	}

	return undefined;
}

/**
 * External finder utilities for canvasMap operations
 * These can be used both inside the store and externally
 */
export class CanvasFinder {
	constructor(private canvasMap: Map<string, Map<string, CanvasPayload>>) {}

	/**
	 * Find all canvas items
	 */
	findAll(): CanvasPayload[] {
		const allCanvas: CanvasPayload[] = [];
		for (const innerMap of this.canvasMap.values()) {
			for (const canvas of innerMap.values()) {
				allCanvas.push(canvas);
			}
		}
		return allCanvas;
	}

	/**
	 * Find canvas by exact composite key (type + roomId + threadId)
	 */
	findByCompositeKey(
		type: CanvasType,
		roomId: string,
		threadId: string,
	): CanvasPayload[] {
		const compositeKey = `type_${type}:room_${roomId}:thread_${threadId}`;
		const innerMap = this.canvasMap.get(compositeKey);
		return innerMap ? Array.from(innerMap.values()) : [];
	}

	/**
	 * Find canvas by roomId and threadId (any type)
	 */
	findByRoomAndThread(roomId: string, threadId: string): CanvasPayload[] {
		const pattern = patternCreators.byRoomAndThread(roomId, threadId);
		return findByPattern(this.canvasMap, pattern);
	}

	/**
	 * Find canvas by roomId only
	 */
	findByRoom(roomId: string): CanvasPayload[] {
		const pattern = patternCreators.byRoom(roomId);
		return findByPattern(this.canvasMap, pattern);
	}

	/**
	 * Find canvas by threadId only
	 */
	findByThread(threadId: string): CanvasPayload[] {
		const pattern = patternCreators.byThread(threadId);
		return findByPattern(this.canvasMap, pattern);
	}

	/**
	 * Find canvas by type and roomId
	 */
	findByTypeAndRoom(type: CanvasType, roomId: string): CanvasPayload[] {
		const pattern = patternCreators.byTypeAndRoom(type, roomId);
		return findByPattern(this.canvasMap, pattern);
	}

	/**
	 * Find canvas by type and threadId
	 */
	findByTypeAndThread(type: CanvasType, threadId: string): CanvasPayload[] {
		const pattern = patternCreators.byTypeAndThread(type, threadId);
		return findByPattern(this.canvasMap, pattern);
	}

	/**
	 * Find canvas by ID across all composite keys
	 */
	findById(id: string): CanvasPayload | null {
		for (const innerMap of this.canvasMap.values()) {
			const canvas = innerMap.get(id);
			if (canvas) {
				return canvas;
			}
		}
		return null;
	}

	/**
	 * Get count of canvas items
	 */
	getCount(): number {
		let count = 0;
		for (const innerMap of this.canvasMap.values()) {
			count += innerMap.size;
		}
		return count;
	}

	/**
	 * Check if canvas exists for given criteria
	 */
	exists(type: CanvasType, roomId: string, threadId: string): boolean {
		return this.findByCompositeKey(type, roomId, threadId).length > 0;
	}
}

/**
 * Create a CanvasFinder instance from a canvasMap
 */
export function createCanvasFinder(
	canvasMap: Map<string, Map<string, CanvasPayload>>,
): CanvasFinder {
	return new CanvasFinder(canvasMap);
}
